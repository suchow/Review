Figures = new Meteor.Collection("figures");
Reviews = new Meteor.Collection("reviews");

if (Meteor.isClient) {
  
  Session.set('isreviewing', false);
  Session.set('issubmitting', false);
  Session.set('isbeingwelcomed', true);
  
  Template.writereview.isreviewing = function () {
    return Session.get('isreviewing');
  };
    
  Template.writereview.events({
    'click #write-review-submit-button' : function () {
      
      // create a new review record
      var id = Reviews.insert({
      submission_time: Date.now(),
              creator: -1,
           figure_url: Session.get('fig_id_to_review'),
                 text: document.getElementById("write-review-description").value,
              ratings: new Array() 
      });
      
      // update figure record
      Figures.update(Session.get('fig_id_to_review'), {
        $push : { reviews: id }
      });
      
      Session.set('isreviewing', false);
      Session.set('isbeingwelcomed', true);
    }
  });
  
  Template.writereview.rendered = function () {
    console.log('The template writereview was just rendered.');
  };
  
  Template.writereview.figuretoreview = function () {
    var fig = Figures.findOne({}, {sort : {good_reviews:1, submission_time:1}});
    return fig.figure_url;
  };

  Template.welcome.newuser = function () {
    if(Meteor.user() === null)
      return true;
    else
      return false;
  };
  
  Template.welcome.isbeingwelcomed = function () {
    return Session.get('isbeingwelcomed');
  };

  Template.welcome.events({
    'click #welcome-write-review' : function () {
      Session.set('isbeingwelcomed', false);
      Session.set('isreviewing', true);
    },
    
    'click #welcome-get-review' : function () {
      Session.set('isbeingwelcomed', false);
      Session.set('issubmitting', true);
    }
  });
  
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
              creator: -1,
           figure_url: Session.get('figure_url'),
               fields: document.getElementById("get-review-field").value,
          description: document.getElementById("get-review-description").value,
              reviews: new Array(), // list of review _id's
         good_reviews: 0
      });
      Session.set('issubmitting', false);
      Session.set('isreviewing', true);
      scroll(0,0);
    }
  });
  
  Template.getreview.rendered = function () {
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}