Bot
===

A bare bones chat bot built using Simple-XMPP that works on HipChat.

Sample Configuration (config/config.js)
----------

```
module.exports = {
  default: {
    connection: {
      jid: '<userid>@<domain>',
      password: '<password>',
      host: '<domain>',
      port: 5222, // typically, but not always
    },
    rooms: [
      '<roomid>@<domain for rooms>/<nickname>'
    ],
    greeting: 'Hello, I\'m online'
  }
};
```
