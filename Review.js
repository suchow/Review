Figures = new Meteor.Collection("figures");
Reviews = new Meteor.Collection("reviews");
Ratings = new Meteor.Collection("ratings");

pointsPerReview = 10;
pointsPerRating = 2; 
pointsToSubmit = 20;

if (Meteor.isClient) {  
  
  // accounts
  Accounts.ui.config({
    requestPermissions: {
      facebook: ['email'],
       twitter: ['email'],
        google: ['email']
    },
    passwordSignupFields: 'USERNAME_AND_EMAIL'
  });
  
  // routing
  Meteor.Router.add({
    '/'       : 'welcome',
    '/review' : 'writeReview',
    '/submit' : 'getReview',
    '/rate'   : 'rateReview',
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
    Meteor.call('getCredit', 
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
    
    // assign review credits
    outstanding_reviews = Session.get('unsigned_reviews');
    for (x in outstanding_reviews) {
      Reviews.update(outstanding_reviews[x], {creator: Meteor.userId()});
    }
    Session.set('unsigned_reviews', new Array());
    
    // assign rating credits
    outstanding_ratings = Session.get('unsigned_ratings');
    for (x in outstanding_ratings) {
      Ratings.update(outstanding_ratings[x], {creator: Meteor.userId()});
    }
    Session.set('unsigned_ratings', new Array());
    
    // assign credit
    if (Meteor.userId() !== null) {
      Meteor.call('getCredit', 
        function (error, result) { Session.set('credit', result) });
    }
    
    // make shortUrl for user page.
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
    return pointsPerRating*Session.get('unsigned_ratings').length + 
           pointsPerReview*Session.get('unsigned_reviews').length;
  };
  
  Template.welcome.hasoutstandingcredit = function () {
    return (unsigned_credits() > 0);
  };
  
  Template.welcome.unsignedcredits = function () {
    return unsigned_credits();
  };
  
  Template.welcome.hasenoughcreditforreview = function () {
    return Session.get('credit') >= pointsToSubmit;
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
       raters_all: {$ne: Session.get('tmpId')}}, 
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
  Template.writeReview.events({
    'click #write-review-submit-button' : function () {
      
     // signed or unsigned review?
     if(Meteor.user()) {
       if(document.getElementById("write-review-signed").checked) {
         var thisCreator = Session.get('tmpId');
       } else {
         var thisCreator = Meteor.uuid();
       };
     };
 
     // create a new review record
     var id = Reviews.insert({
          submission_time: Date.now(),
                  creator: thisCreator,
             creator_name: getName(thisCreator), 
                figure_id: Session.get('fig_to_review')._id,
                     text: document.getElementById("write-review-description").value,
               raters_yes: new Array(),
                raters_no: new Array(),
               raters_all: new Array(),
              num_ratings: 0,
               acceptable: false,
         notificationSent: false,
      });
                        
      // update figure record
      Figures.update(Session.get('fig_to_review')._id, {
        $push : { reviews: id },
        $push : { reviewers: thisCreator }
      });
      
      // update session record
      if(Meteor.userId() === null) {
        var tmp_reviews = Session.get('unsigned_reviews');
        tmp_reviews.push(id);
        Session.set('unsigned_reviews',tmp_reviews);
      } else {
        Session.set('credit', Session.get('credit') + pointsPerReview);
        localStorage.setItem('credit', localStorage.credit + pointsPerReview);
      }
      
      // return to welcome screen
      Meteor.Router.to('/');
    }
  });
  
  Template.writeReview.figuretoreview = function () {
    return Session.get('fig_to_review').figure_url;
  };
  
  Template.writeReview.figuretoreviewfields = function () {
    return Session.get('fig_to_review').fields;
  };
  
  Template.writeReview.figuretoreviewdescription = function () {
    return Session.get('fig_to_review').description;
  };
  
  Template.writeReview.creator = function () {
    return getName(Meteor.userId());
  }

  // 
  // Templates for the submitting screen
  //
  Template.getReview.events({
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
      } else {

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

        // shorten the url
        Meteor.http.call("GET", "https://api-ssl.bitly.com/v3/shorten",
          {params: {login:'plot5', apiKey:'R_0832b91fcc597080840dea29e1e97b2d',
            longUrl: "http://review.plot5.com/figures/" + id}}, // replace with Meteor.absoluteUrl
          function (error, result) {
            if (result.statusCode === 200) {
              console.log(result.data.data.url);
              Figures.update(id, { $set : { shortUrl: result.data.data.url }});
            } else {
              return null;
            }
          }
        );

        if(Meteor.userId() !== null) {
          Session.set('credit', Session.get('credit') - pointsToSubmit);
          localStorage.setItem('credit', localStorage.credit - pointsToSubmit);
        };

        Meteor.Router.to('/');
        scroll(0,0);
      }
    }
  });
  
  Template.getReview.rendered = function () {
    if(Meteor.user() === null) {
      Meteor.Router.to('/');
    }
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };
  
  Template.getReview.created = function () {
    Session.set('figure_url', null);
  };
  
  // 
  // Templates for the rating view
  //
  Template.rateReview.creator = function () {
    return Session.get('reviewtorate').creator; 
  }
  
  Template.rateReview.creator_name = function () {
    return getName(Session.get('reviewtorate').creator); 
  }
  
  Template.rateReview.submission_time = function () {
    return moment(Session.get('reviewtorate').submission_time).fromNow();
  }
  
  Template.rateReview.reviewtorate = function () {
    function p(t){
        t = t.trim();
        return (t.length>0?t.replace(/[\r\n]+/,'</p><p>'):null);
    }
    t = '<p>' + p(p(p(p(Session.get('reviewtorate').text)))) + '</p>';
    return t;
  };
  
  Template.rateReview.figuretoratereview = function () {
    return Session.get('reviewtorate').figure_url;
  };
  
  Template.rateReview.events({
    'click #rate-review-yes' : function (evt) { 
      updateAfterRating(1);  
    },
    
    'click #rate-review-no' : function () {
      updateAfterRating(0);    
    }
  });
  
  // is the review acceptable given this number of yes and no's?
  function isAcceptable(y,n) {
    return ((y > n) && ((y + n) > 1));
  };
  
  function updateAfterRating(rating) {
  
    var review = Session.get('reviewtorate');
    
    // check acceptability before the rating
    var ys = review.raters_yes.length;
    var ns = review.raters_no.length;
    var acc0 = isAcceptable(ys,ns);
    
    // create a new rating
    var rating_id = Ratings.insert({
      submission_time: Date.now(),
              creator: Session.get('tmpId'),
            review_id: review._id,
               rating: rating
    });

    // update this review            
    Reviews.update(review._id, {
      $inc  : {  num_ratings: 1 },
      $push : {  raters_all: Session.get('tmpId') }
    });
      
    if(rating === 1) {
      Reviews.update(review._id, {
        $push : { raters_yes: Session.get('tmpId') }
      });
    } else {
      Reviews.update(review._id, {
        $push : {  raters_no: Session.get('tmpId') }});
    };

    // recompute acceptability  
    var acc1 = isAcceptable(ys+rating, ns+!rating);

    // stuff to do when the review becomes acceptable
    if(!acc0 && acc1) {
      Figures.update(review.figure_id, {
        $inc : { acceptable_reviews: 1 }
      });
      Reviews.update(review._id, {
        $set : { acceptable: true }
      });
      if(!review.notificationSent) {
        Meteor.call('notifyFigureCreatorOfReview', review._id);
      };
    };
    
    if(acc0 && !acc1) {
      Reviews.update(review._id, {
        $set : { acceptable: false }
      });
    };
    
    // update session record if user is null
    if(Meteor.userId() === null) {
      var tmp_ratings = Session.get('unsigned_ratings');
      tmp_ratings.push(rating_id);
      Session.set('unsigned_ratings',tmp_ratings);
    } else {
      Session.set('credit', Session.get('credit') + pointsPerRating);
      localStorage.setItem('credit', localStorage.credit + pointsPerRating);
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
    }).map(dataExtractor1);
  };
  
  Template.figurePage.shortUrl = function () {
    var fig = Figures.findOne(Session.get('figure_to_page'));
    if(fig) {
      return fig.shortUrl;
    }
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
    }).map(dataExtractor1);
  };
  
  function dataExtractor1(x) {
    return {
                 text: x.text,
              creator: x.creator,
         creator_name: x.creator_name,
      submission_time: moment(x.submission_time).fromNow()
    };
  }
}

if (Meteor.isServer) {  
    
  function getEmail(userId) {
    if(userId) {
      var userDoc = Meteor.users.findOne(userId);
      if(userDoc) {
        if(typeof userDoc.services.facebook !== 'undefined') {
          return userDoc.services.facebook.email;
        } else if (typeof userDoc.services.google !== 'undefined') {
          return userDoc.services.google.email;
        }
      };
    };
    return "nothing@nada.com";
  };
          
  Meteor.methods({
    getCredit: function () {
      if(this.userId === null) {
        return 0;
      } else {
        return 10*Reviews.find({creator: this.userId}).count() + 
                2*Ratings.find({creator: this.userId}).count() -
               20*Figures.find({creator: this.userId}).count();  
      }
    },
    notifyFigureCreatorOfReview: function (reviewId) {
      var figureId = Reviews.findOne(reviewId).figure_id;
      var userId = Figures.findOne(figureId).creator;
      var emailAddress = getEmail(userId);
      var text = Reviews.findOne(reviewId).text;
      Meteor.setTimeout(function () {
        Email.send({ 
          from: "jordan@plot5.com", 
          to: emailAddress, 
          subject: "A new review of your figure was posted", 
          text: "Hey,\n Someone posted a new review of your figure (http://plot5.com/figures/" + reviewId + "). Here's a copy:\n\n" + text + "\n\n You can see all of the reviews for this figure at http://p5.io/xxxxxx" 
        });
      }, 10*1000); // delay until email is sent
      Reviews.update(reviewId, {
        $set : { notificationSent: true }
      });
    },
    shortenUrl: function () {
      console.log('hello');
      return 'hello';
    }
  });

  Meteor.startup(function () {
    Accounts.loginServiceConfiguration.insert({
      service: "facebook",
        appId: "517679251600238",
       secret: "6441f24fc0865b88b063ff2a69bc05d5"
    });
    Accounts.loginServiceConfiguration.insert({
      service: "google",
     clientId: "89492234995.apps.googleusercontent.com",
       secret: "ktxH3h_kGWAC2GIobuoCHGML"
    });
    // code to run on server at startup
    $MAIL_URL = "smtp://jordan@plot5.com:Bra1nb0x?@brandeisvoicemale.netfirms.com:587/";
  });
}