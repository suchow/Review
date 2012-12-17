Figures = new Meteor.Collection("figures");
Reviews = new Meteor.Collection("reviews");
Ratings = new Meteor.Collection("ratings");

points_per_review = 10;
points_per_rating = 2; 
points_to_submit = 20;

if (Meteor.isClient) {

  Session.set('isbeingwelcomed', true); // start off in welcoming mode
  Session.set('isreviewing', false);
  Session.set('issubmitting', false);
  Session.set('israting', false);
  
  Session.set('unsigned_ratings', new Array());
  Session.set('unsigned_reviews', new Array());
  
  // assign credit to current user
  if (Meteor.userId() === null) {
    Session.set('tmpId', Meteor.uuid()); // generate a new temporary id
    Session.set('credit', 0);
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
  Template.welcome.isbeingwelcomed = function () {
    return Session.get('isbeingwelcomed');
  };
  
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
      Session.set('fig_to_review', fig);
      Session.set('isbeingwelcomed', false);
      Session.set('isreviewing', true);      
    },
    
    'click #welcome-get-review' : function () {
      // check if the user has enough credit
      Session.set('isbeingwelcomed', false);
      Session.set('issubmitting', true);
    },
    
    'click #welcome-rate-review' : function () {
      Session.set('reviewtorate', Reviews.findOne({
          creator: {$ne: Session.get('tmpId')},
           raters: {$ne: Session.get('tmpId')}}, 
           {sort : { num_ratings:1, submission_time:1}}));
      Session.set('isbeingwelcomed', false);
      Session.set('israting', true);
    }
  });
  
  // 
  // Templates for the reviewing screen
  //
  
  Template.writereview.isreviewing = function () {
    return Session.get('isreviewing');
  };
    
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
      }
      
      // return to welcome screen
      Session.set('isreviewing', false);
      Session.set('isbeingwelcomed', true);
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
  
  Template.getreview.issubmitting = function () {
    return Session.get('issubmitting');
  };
  
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
      };
      
      Session.set('issubmitting', false);
      Session.set('isbeingwelcomed', true);
      scroll(0,0);
    }
  });
  
  Template.getreview.rendered = function () {
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };
  
  // 
  // Templates for the rating view
  //
  Template.ratereview.israting = function () {
    return Session.get('israting');
  };
  
  Template.ratereview.reviewtorate = function () {
    return Session.get('reviewtorate').text;
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
    }
    // return to welcome screen
    Session.set('israting', false);
    Session.set('isbeingwelcomed', true);
  }
}

if (Meteor.isServer) {
  
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