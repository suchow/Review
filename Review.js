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
      if (typeof console !== 'undefined')
        console.log("You pressed the to get a review");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
