var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var csurf = require('csurf');

const USER = 'admin';
const PASSWORD = 'password1';
var accountBalance = 1000;
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
   secret: 'SESSION_SECRET',
   resave: false,
   saveUninitialized: true,
   cookie: { maxAge: 300000, sameSite: false }
}));

app.use(function (req, res, next) {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Credentials', true);
   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
   next();
});

// Auth
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password'
   }, function (user, password, done) {
   if (user === USER && password === PASSWORD) {
      return done (null, { username: user });
   }
   return done (null, false);
}));

passport.serializeUser(function (user, done) {
   return done(null, user);
});
 
passport.deserializeUser(function (user, done) {
   return done(null, user);
});

function isAuthenticated(req, res, next) {
   if (req.isAuthenticated())
      return next();
   return res.redirect('/login');
}

app.get('/', isAuthenticated, function (req, res, next) {
   res.sendFile(__dirname + '/index.html');
});

app.get('/login', function (req, res, next) {
   res.sendFile(__dirname + '/login.html');
});

app.post('/login', function (req, res, next) {
   passport.authenticate('local', function (err, user, info) {
      if (err) {
         return res.redirect('/login');
      }

      req.logIn(user, function () {
         return res.redirect('/');
      });
   })(req, res, next);
});

app.get('/logout', isAuthenticated, function (req, res, next) {
   req.logout();
   res.redirect('/login');
});

app.use(csurf({ cookie: true }));

app.get('/balance', isAuthenticated, function (req, res, next) {
   res.send({ balance: accountBalance });
});

app.get('/transfer', isAuthenticated, function (req, res, next) {
   res.send(`
      <html>
         <head>
            <link rel="stylesheet" href="styles.css" />
            <script src="jquery-3.3.1.min.js"></script>
         </head>
         <body>
            <form action="/transfer" method="POST">
               <h1>Transfer</h1>
               <input type="hidden" value="${req.csrfToken()}" name="_csrf" />
               <label for="user">User:</label>
               <input type="text" name="user"/>
               <label for="amount">Amount (€):</label>
               <input type="text" name="amount"/>
               <button type="submit">Transfer Funds</button>
            </form>
            <div>
               <a href="/">Balance</a>
               <a href="/logout">Logout</a>
            </div>
         </body>
      </html>`);
})

app.post('/transfer', isAuthenticated, function (req, res, next) {
   var amount = parseInt(req.body.amount);
   var user = req.body.user;
   
   if (!user) {
      // Pretend there's real user validation here
      res.status(400).redirect('/');
   }
   if (isNaN(amount) || amount <= 0) {
      res.status(400).redirect('/');
   }
   
   if (amount > accountBalance) {
      res.status(400).redirect('/');
   }

   accountBalance -= amount;
   res.redirect('/');
});

app.listen(process.env.PORT || 3002);