Figures = new Meteor.Collection("figures");

if (Meteor.isClient) {
  
  Template.writereview.events({
    'click #write-review-submit-button' : function () {
      changeview('write-review', 'welcome');
      var id = Session.get('fig_id_to_review');
      console.log(id);
      Figures.update(id, {
        $push : { reviews: document.getElementById("write-review-description").value }
      });
    }
  });

  Template.welcome.events({
    'click #welcome-write-review' : function () {
      showfiguretoreview();
      changeview('welcome', 'write-review');
    },
    
    'click #welcome-get-review' : function () {
      changeview('welcome', 'get-review')
    }
  });
  
  Template.getreview.events({
    'change #get-review-upload-fp': function(evt) {
      Session.set('figure_url', evt.files[0].url);
      // show the newly uploaded figure
      var img = document.getElementById('get-review-upload-preview');
      img.src = Session.get('figure_url');
      changeview('get-review-upload-fp-wrapper', 'get-review-upload-preview');
    },
    
    'click #get-review-submit-button' : function () {      
      // create a new figure
      var id = Figures.insert({
      submission_time: Date.now(),
           figure_url: Session.get('figure_url'),
               fields: document.getElementById("get-review-field").value,
          description: document.getElementById("get-review-description").value,
              reviews: Array(), // list of review _id's
         good_reviews: 0
      });
      showfiguretoreview();
      changeview('get-review', 'write-review');
    }
  });
  
  Template.getreview.rendered = function () {
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };
  
  function showfiguretoreview() {
    var fig = Figures.findOne({}, {sort : {good_reviews:1, submission_time:1}});
    Session.set('fig_id_to_review', fig._id);
    document.getElementById('write-review-fig-preview').src = fig.figure_url;
  }
  
  function changeview(id1,id2) {
    document.getElementById(id1).style.display = "none";
    document.getElementById(id2).style.display = "block";
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}