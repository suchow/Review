Figures = new Meteor.Collection("figures");

if (Meteor.isClient) {
  // Template.hello.greeting = function () {
  //   return "Welcome to Review.";
  // };

  Template.welcome.events({
    'click #welcome-write-review' : function () {
      if (typeof console !== 'undefined')
        console.log("You pressed to write a review");
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
           start_time: Date.now(),
           figure_url: Session.get('figure_url'),
               fields: document.getElementById("get-review-field").value,
          description: document.getElementById("get-review-description").value,
      });
      console.log(Figures.findOne({_id: id}));   
      changeview('get-review', 'write-review');
    }
  });
  
  Template.getreview.rendered = function () {
    filepicker.setKey("AcN4KNYMSeats1v5zAAhMz");
    filepicker.constructWidget(document.getElementById('get-review-upload-fp'));
  };
  
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