Figures = new Meteor.Collection("figures");
Reviews = new Meteor.Collection("reviews");

if (Meteor.isClient) {

  // start off in welcoming mode
  Session.set('isbeingwelcomed', true);
  Session.set('isreviewing', false);
  Session.set('issubmitting', false);
  Session.set('israting', false);
  Session.set('ratings', new Array());
  Session.set('reviews', new Array());
  
  // give the signed-in user all outstanding credit
  Meteor.autorun(function(handle) {
    if (Meteor.userId() === null) 
      return;
    handle.stop();
    
    // assign review credits
    outstanding_reviews = Session.get('reviews');
    for (x in outstanding_reviews) {
      Reviews.update(outstanding_reviews[x], {creator: Meteor.userId()});
    }
    Session.set('reviews', new Array());
    
    // assign rating credits
    outstanding_ratings = Session.get('ratings');
    for (x in outstanding_ratings) {
      Reviews.update(outstanding_ratings[x], {creator: Meteor.userId()});
    }
    Session.set('ratings', new Array());
  });
  
  // 
  // Templates for the welcome view
  //
  Template.welcome.hascredit = function () {
    var credits = Session.get('ratings').length + Session.get('reviews').length;
    return (credits > 0);
  };
  
  Template.welcome.reviewscredit = function () {
    return Session.get('reviews').length;
  };
  
  Template.welcome.ratingscredit = function () {
    return Session.get('ratings').length;
  };
  
  Template.welcome.isbeingwelcomed = function () {
    return Session.get('isbeingwelcomed');
  };

  Template.welcome.events({
    'click #welcome-write-review' : function () {
      var fig = Figures.findOne({}, {sort : {good_reviews:1, submission_time:1}});
      Session.set('fig_to_review', fig);
      Session.set('isbeingwelcomed', false);
      Session.set('isreviewing', true);      
    },
    
    'click #welcome-get-review' : function () {
      Session.set('isbeingwelcomed', false);
      Session.set('issubmitting', true);
    },
    
    'click #welcome-rate-review' : function () {
      Session.set('isbeingwelcomed', false);
      Session.set('israting', true);
      Session.set('reviewtorate', Reviews.findOne({}, {sort : { num_ratings:1, submission_time:1}}));
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
              creator: Meteor.userId(),
            figure_id: Session.get('fig_to_review')._id,
                 text: document.getElementById("write-review-description").value,
              ratings: new Array(),
          num_ratings: 0
      });
      
      // update figure record
      Figures.update(Session.get('fig_to_review')._id, {
        $push : { reviews: id }
      });
      
      // update session record
      var tmp_reviews = Session.get('reviews');
      tmp_reviews.push(id);
      Session.set('reviews',tmp_reviews);
      
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
  // Templates for the submitting view
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
              creator: Meteor.userId(),
           figure_url: Session.get('figure_url'),
               fields: document.getElementById("get-review-field").value,
          description: document.getElementById("get-review-description").value,
              reviews: new Array(), // list of review _id's
         good_reviews: 0
      });
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
      var review = Session.get('reviewtorate');
      Reviews.update(review._id, {
        $push : { ratings: 1 },
        $inc  : { num_ratings: 1 }
      });
      
      // do this only the first time
      Figures.update(review.figure_id, {
        $inc : { good_reviews: 1 }
      });
      
      // update session record
      var tmp_toadd = new Array(review._id,1);
      var tmp_ratings = Session.get('ratings');
      tmp_ratings.push(tmp_toadd);
      Session.set('ratings',tmp_ratings);
      
      // return to welcome screen
      Session.set('israting', false);
      Session.set('isbeingwelcomed', true);
    },
    
    'click #rate-review-no' : function () {
      var review = Session.get('reviewtorate');
      Reviews.update(review._id, {
        $push : { ratings: 0 },
        $inc  : { num_ratings: 1 }
      });
      
      // update session record
      var tmp_ratings = Session.get('ratings');
      tmp_ratings.push(review._id);
      Session.set('ratings',tmp_ratings);
      
      Session.set('israting', false);
      Session.set('isbeingwelcomed', true);
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}