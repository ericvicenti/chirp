$(function() {

  var authToken;

  var socket = io.connect();


  function goLogin() {
    socket.emit('login', {
      name: $('#chatStartNameInput').val(),
      secret: $('#chatStartSecretInput').val()
    });
  }

  function listenForEnter(el, action) {
    el.bind("keypress", function(event) {
      if(event.which == 13) {
        event.preventDefault();
        action();
      }
    });
  }

  listenForEnter($("#chatStartSecretInput"), goLogin);
  listenForEnter($("#chatStartNameInput"), goLogin);
  $('#chatStartButton').click(goLogin);

  socket.on('auth/success', function (user) {
    $('#userTitle').removeClass('hide').text(' - '+user.displayName);
    $('#loginFormSection').remove();
    $('.chatUi').removeClass('hide');
    $('#chatSendInput').focus();
  });

  function addChat (chat) {
    var time = moment(new Date(chat.timePosted)).format('MMMM Do YYYY, h:mm:ss a');
    var timeEl = $('<span>').addClass('text-muted pull-right').text(time);
    var titleEl = $('<h4>').text(chat.sender).append(timeEl);
    var msgEl = $('<div>').text(chat.msg);
    var chatEl = $('<div>').addClass('chatItem').append(titleEl, msgEl);
    $('#chatList').append(chatEl);
  }

  socket.on('chat/success', function (chat) {
    addChat(chat);
  });

  socket.on('chat', function (chat) {
    addChat(chat);
    socket.emit('chat/recieved/' + chat.id, { read: true });
  });

  socket.on('chats', function (chats) {
    _.each(chats, function(chat) {
      addChat(chat);
    });
  });

  socket.on('auth/error', function (data) {
    alert(data.msg);
  });

  function goChat() {
    var msg = $('#chatSendInput').val();
    $('#chatSendInput').val('');
    $('#chatSendInput').focus();
    socket.emit('chat', {
      msg: msg
    });
  }

  listenForEnter($("#chatSendInput"), goChat);
  $('#chatSendButton').click(goChat);

  $('#chatStartNameInput').focus();

});