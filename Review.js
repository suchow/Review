Figures = new Meteor.Collection("figures");
Reviews = new Meteor.Collection("reviews");
Ratings = new Meteor.Collection("ratings");

points_per_review = 10;
points_per_rating = 2; 
points_to_submit = 20;

if (Meteor.isClient) {
  
  // Accounts.ui.config({
  //   requestPermissions: {
  //     facebook: ['email'],
  //   },
  //   passwordSignupFields: 'USERNAME_AND_EMAIL'
  // });
  
  Meteor.Router.add({
    '/'       : 'welcome',
    '/review' : 'writereview',
    '/submit' : 'getreview',
    '/rate'   : 'ratereview'
    '/figures/:id': function(id) {
      Session.set('figure_to_page', id);
      return 'figurePage';
    },
    '/users/:id' : function(id) {
      Session.set('user_to_page', id);
      return 'userPage';
    }
  });
  
  Session.set('unsigned_ratings', new Array());
  Session.set('unsigned_reviews', new Array());
  
  
  // get the name of the user from id
  function getName(id) {
    var tmp = Meteor.users.findOne(id);
    if(tmp){
      return tmp.profile.name;
    } else {
      return "Anonymous";
    }
  };
  
  // assign credit to current user
  if (Meteor.userId() === null) {
    
    // check if they have a tmpId in local storage
    if(localStorage.tmpId) {
      Session.set('tmpId', localStorage.tmpId); // generate a new temporary id 
      Session.set('credit', localStorage.credit);
    } else {
      var tmpId = Meteor.uuid();
      localStorage.setItem('tmpId', tmpId);
      Session.set('tmpId', tmpId); // generate a new temporary id
      Session.set('credit', 0);
    }
  } else {
    Meteor.call('getCredit', Meteor.userId(), 
      function (error, result) { Session.set('credit', result) });
    Session.set('tmpId', Meteor.userId());
  }
  
  //
  // Actions to take when a user signs in
  //
  Meteor.autorun(function(handle) {
    if (Meteor.userId() === null) { 
      return;
    }
    handle.stop();
    
    Session.set('tmpId', Meteor.userId());
    console.log('signed in!');
    
    // assign review credits
    outstanding_reviews = Session.get('unsigned_reviews');
    console.log(outstanding_reviews);
    for (x in outstanding_reviews) {
      Reviews.update(outstanding_reviews[x], {creator: Meteor.userId()});
    }
    Session.set('unsigned_reviews', new Array());
    
    // assign rating credits
    outstanding_ratings = Session.get('unsigned_ratings');
    console.log(outstanding_ratings);
    for (x in outstanding_ratings) {
      Ratings.update(outstanding_ratings[x], {creator: Meteor.userId()});
    }
    Session.set('unsigned_ratings', new Array());
    
    // assign credit
    if (Meteor.userId() !== null) {
      Meteor.call('getCredit', Meteor.userId(), 
        function (error, result) { Session.set('credit', result) });
    }
  });
  
  //
  // Templates for login bar
  //
  Template.login.credit = function () {
    return Session.get('credit');
  };
    
  // 
  // Templates for the welcome view
  //
  function unsigned_credits() {
    return points_per_rating*Session.get('unsigned_ratings').length + 
           points_per_review*Session.get('unsigned_reviews').length;
  };
  
  Template.welcome.hasoutstandingcredit = function () {
    return (unsigned_credits() > 0);
  };
  
  Template.welcome.unsignedcredits = function () {
    return unsigned_credits();
  };
  
  Template.welcome.hasenoughcreditforreview = function () {
    return Session.get('credit') >= points_to_submit;
  };

  Template.welcome.events({
    'click #welcome-write-review' : function () {
      var fig = Figures.findOne({
          creator: {$ne: Session.get('tmpId')}, 
        reviewers: {$ne: Session.get('tmpId')}}, 
           {sort : {acceptable_reviews:1, submission_time:1}});
      if(fig) {
        Session.set('fig_to_review', fig);
        Meteor.Router.to('/review');
      } else {
        // if the alert isn't already up, put it up
        var el = document.getElementById('alert-review');
        if(el) { el.style.display = "block"; }
      }
    },
    
    'click #welcome-get-review' : function () {
      Meteor.Router.to('/submit');
    },
    
    'click #welcome-rate-review' : function () {
      var rev = Reviews.findOne({
          creator: {$ne: Session.get('tmpId')},
           raters: {$ne: Session.get('tmpId')}}, 
           {sort : { num_ratings:1, submission_time:1}});
     if(rev) {
       Session.set('reviewtorate', rev);
       Meteor.Router.to('/rate');
     } else { 
       // if the alert isn't already up, put it up
       var el = document.getElementById('alert-rating');
       if(el) { el.style.display = "block"; }
     }
    }
  });
  
  // 
  // Templates for the reviewing screen
  //
  Template.writereview.events({
    'click #write-review-submit-button' : function () {
      
      // create a new review record
     var id = Reviews.insert({
      submission_time: Date.now(),
              creator: Session.get('tmpId'),
            figure_id: Session.get('fig_to_review')._id,
                 text: document.getElementById("write-review-description").value,
              ratings: new Array(),
          num_ratings: 0,
               raters: new Array()
      });
      
      // update figure record
      Figures.update(Session.get('fig_to_review')._id, {
        $push : { reviews: id },
        $push : { reviewers: Session.get('tmpId') }
      });
      
      // update session record
      if(Meteor.userId() === null) {
        var tmp_reviews = Session.get('unsigned_reviews');
        tmp_reviews.push(id);
        Session.set('unsigned_reviews',tmp_reviews);
      } else {
        Session.set('credit', Session.get('credit') + points_per_review);
        localStorage.setItem('credit', localStorage.credit + points_per_review);
      }
      
      // return to welcome screen
      Meteor.Router.to('/');
    }
  });
  
  Template.writereview.figuretoreview = function () {
    return Session.get('fig_to_review').figure_url;
  };
  
  Template.writereview.figuretoreviewfields = function () {
    return Session.get('fig_to_review').fields;
  };
  
  Template.writereview.figuretoreviewdescription = function () {
    return Session.get('fig_to_review').description;
  };

  // 
  // Templates for the submitting screen
  //
  Template.getreview.events({
    'change #get-review-upload-fp': function(evt) {
      Session.set('figure_url', evt.files[0].url);
      // show the newly uploaded figure
      var img = document.getElementById('get-review-upload-preview');
      img.src = Session.get('figure_url');
      document.getElementById('get-review-upload-fp-wrapper').style.display = "none";
      document.getElementById('get-review-upload-preview').style.display = "block";
    },
    
    'click #get-review-submit-button' : function () {
      if(Session.equals('figure_url', null)) {
        el = document.getElementById("alert-no-figure-upload");
        if(el) { el.style.display = "block"; }
        return;
      }
            
      // create a new figure
      var id = Figures.insert({
          submission_time: Date.now(),
                  creator: Session.get('tmpId'),
               figure_url: Session.get('figure_url'),
                   fields: document.getElementById("get-review-field").value,
              description: document.getElementById("get-review-description").value,
                  reviews: new Array(), // list of review _id's
       acceptable_reviews: 0,
                reviewers: new Array() // list of reviewer id's
      });
      
      if(Meteor.userId() !== null) {
        Session.set('credit', Session.get('credit') - points_to_submit);
        localStorage.setItem('credit', localStorage.credit - points_to_submit);
      };
      
      Meteor.Router.to('/');
      scroll(0,0);
    }
  });
  
  Template.getreview.rendered = function () {
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };
  
  Template.getReview.created = function () {
    Session.set('figure_url', null);
  };
  
  // 
  // Templates for the rating view
  //
  Template.ratereview.reviewtorate = function () {
    function p(t){
        t = t.trim();
        return (t.length>0?t.replace(/[\r\n]+/,'</p><p>'):null);
    }
    t = '<p>' + p(p(p(p(Session.get('reviewtorate').text)))) + '</p>';
    return t;
  };
  
  Template.ratereview.figuretoratereview = function () {
    return Session.get('reviewtorate').figure_url;
  };
  
  Template.ratereview.events({
    'click #rate-review-yes' : function (evt) { 
      updateAfterRating(1);  
    },
    
    'click #rate-review-no' : function () {
      updateAfterRating(0);    
    }
  });
  
  function updateAfterRating(rating) {
    
    var review = Session.get('reviewtorate');
    
    // create a new rating
    var rating_id = Ratings.insert({
      submission_time: Date.now(),
              creator: Session.get('tmpId'),
            review_id: review._id,
               rating: rating
    });
    
    Reviews.update(review._id, {
      $push : { ratings: rating_id },
      $inc  : { num_ratings: 1 },
      $push : { raters: Session.get('tmpId') }
    });
    
    // do this only the first time
    if(rating === 1) {
      Figures.update(review.figure_id, {
        $inc : { acceptable_reviews: 1 }
      });
    }
    
    // update session record if user is null
    if(Meteor.userId() === null) {
      var tmp_ratings = Session.get('unsigned_ratings');
      tmp_ratings.push(rating_id);
      Session.set('unsigned_ratings',tmp_ratings);
    } else {
      Session.set('credit', Session.get('credit') + points_per_rating);
      localStorage.setItem('credit', localStorage.credit + points_per_rating);
    }
    // return to welcome screen
    Meteor.Router.to('/');
  }
  
  
  // 
  // Templates for the figure view
  //
  Template.figurePage.figure = function () {
    // todo: check permissions
    var fig = Figures.findOne(Session.get('figure_to_page'));
    if(fig) {
      return fig.figure_url;
    }
  };
    
  Template.figurePage.reviews = function () {
    return Reviews.find({
      figure_id: Session.get('figure_to_page')
    }).map(function (x) {
      return {
                   text: x.text,
                creator: x.creator,
           creator_name: x.creator_name,
        submission_time: moment(x.submission_time).fromNow()
      };
    });
  };
  
  
  //
  // Templates for the user view
  //
  Template.userPage.userName = function () {
    return getName(Session.get('user_to_page'));
  }
  
  Template.userPage.reviews = function () {
    return Reviews.find({
      creator: Session.get('user_to_page')
    }).map(function (x) {
      return {
                   text: x.text,
                creator: x.creator,
           creator_name: x.creator_name,
        submission_time: moment(x.submission_time).fromNow()
      };
    });
  };
}

if (Meteor.isServer) {
  
  // Accounts.onCreateUser(function(options, user) {
  //     if (options.profile) { // maintain the default behavior
  //         user.profile = options.profile;
  //     }
  // 
  //     // get profile data from Facebook
  //     var result = Meteor.http.get("https://graph.facebook.com/me", {
  //       params: {access_token: user.services.facebook.accessToken}});
  // 
  //     if ( !result.error && result.data ) {
  //         // if successfully obtained facebook profile, save it off
  //         user.profile.facebook = result.data;
  //         user.email = result.data.email;
  //     }
  // 
  //     return user;
  // });
  
  Meteor.methods({
    getCredit: function (user_id) {
      if(user_id === null) {
        return 0;
      } else {
        return 10*Reviews.find({creator: user_id}).count() + 
                2*Ratings.find({creator: user_id}).count() -
               20*Figures.find({creator: user_id}).count();  
      }
    }
  });

  Meteor.startup(function () {
    // code to run on server at startup
  });
}