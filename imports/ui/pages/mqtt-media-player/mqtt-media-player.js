// Framework
import { Meteor } from 'meteor/meteor';
// App
import './mqtt-media-player.html';
import './mqttws31.js';
import './video-player.js';
import './audio-player.js';
import '../../components/fullscreen-video/fullscreen-video.js';
import '../../components/debug-console/debug-console.js';

// hostname or IP address
host = Meteor.settings.public.mqtt.host || 'localhost';
port = Meteor.settings.public.mqtt.port || 9001;
username = Meteor.settings.public.mqtt.username || null;
password = Meteor.settings.public.mqtt.password || null;
topic = '#';		// topic to subscribe to
useTLS = false;
cleansession = true;

var mqtt;
var reconnectTimeout = 2000;
var ap;
var vp;

var MQTTconnect = function() {
  if (typeof path == "undefined") {
    path = '/mqtt';
  }

  var clientId = "web_" + parseInt(Math.random() * 100, 10);

  mqtt = new Paho.MQTT.Client(host, port, path, clientId);

  var options = {
      timeout: 3,
      useSSL: useTLS,
      cleanSession: cleansession,
      onSuccess: onConnect,
      onFailure: function (message) {
        $('#status').val("Connection failed: " + message.errorMessage + "Retrying");
        setTimeout(MQTTconnect, reconnectTimeout);
      }
  };

  mqtt.onConnectionLost = onConnectionLost;
  mqtt.onMessageArrived = onMessageArrived;

  if (username != null) {
    options.userName = username;
    options.password = password;
  }
  mqtt.connect(options);
}

function onConnect() {
  $('#status').val('Connected to ' + host + ':' + port + path);
  // Connection succeeded; subscribe to our topic
  mqtt.subscribe(topic, {qos: 0});
  $('#topic').val(topic);
}

function onConnectionLost(response) {
  setTimeout(MQTTconnect, reconnectTimeout);
  $('#status').val("connection lost: " + response.errorMessage + ". Reconnecting");
}

function onMessageArrived(message) {
  var topic = message.destinationName;
  var action = topic.split('/').pop();
  var payload = message.payloadString;

  switch (action) {
    // General
    case 'stop-all':
      if(ap) ap.stop();
      if(vp) vp.stop();
      break;
    // Audio
    case 'play-audio':
      ap = new AudioPlayer({file: payload, volume: 100});
      break;
    case 'stop-audio':
      if(ap) ap.stop();
      break;
    case 'pause-audio':
      if(ap) ap.pause();
      break;
    case 'resume-audio':
      if(ap) ap.resume();
      break;
    // Video
    case 'play-video':
      vp = new VideoPlayer({file: payload});
      break;
    case 'stop-video':
      if(vp) vp.stop();
      break;
    case 'pause-video':
      if(vp) vp.pause();
      break;
    case 'resume-video':
      if(vp) vp.resume();
      break;
  }

  $('#ws').prepend('<li>' + topic + ': ' + payload + '</li>');
};

Template.mqttMediaPlayer.onCreated(function(){
  var roomSlug = FlowRouter.current().params['roomSlug'];
  var playerId = FlowRouter.current().params['playerId'];
  topic = roomSlug + '/mqtt-media-player/' + playerId + '/#';
  MQTTconnect();
});