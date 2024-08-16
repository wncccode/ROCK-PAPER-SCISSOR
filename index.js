const express = require('express');
const server = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const {Client} = require('pg');

const client = new Client({

					user: 'rishi',
					host: 'localhost',
					database: 'mydatabase',
					password: 'rishi',
					port: '5432'
});


client.connect((err) => {
  if (err) {
    console.error('Connection error', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
    
    // Example query
    client.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Query error', err.stack);
      } else {
        console.log('Query result:', res.rows);
      }
     
      // Close the connection
    });
  }
});



					
const app = express();

const httpserver = server.createServer(app);
const io = socketIo(httpserver);


const path = require('path');
app.use(express.static(path.join(__dirname ,'client')));


app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

let verify = false;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client' , 'login.html'));
});

app.post('/logincheck' , async (req , res) =>{


    const username = req.body.user;
    const password = req.body.password;
    // console.log(username);
    // console.log(password);

    const token = jwt.sign({username: username , password: password } , 'rishi' , { expiresIn: '1hr' });
    await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(50) NOT NULL,
      score INT NOT NULL
    )
  `);
    //console.log("jumped");
    const result = await client.query('SELECT * FROM users WHERE username = $1 AND password  = $2' , [username , password]);
    if(result.rows.length > 0){
      //console.log("hhhhh");
      res.cookie('token' , token , {httpsOnly: true});
      res.redirect('/game');
    }
    else{
      res.send('failed');
    }


});

app.get('/game' , (req , res) => {
  res.sendFile(path.join(__dirname , 'client' , 'game.html'));
}
);

app.post('/signup' , async(req , res) =>{

  const username = req.body.newusername;
  const password = req.body.newpassword;
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(50) NOT NULL,
      score INT NOT NULL
    )
  `);

    //console.log(username);
    //console.log(password);
  //console.log("checking....");
  const result = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2' , [username , password]);
  if(result.rows.length > 0){
    res.send('sign up failed because already a user exists with same credentials');
   
  }
  else{
    await client.query('INSERT INTO users (username , password , score) VALUES ($1 , $2, $3)' , [username , password , 0]);
    //res.send('signup successfull');
    res.sendFile(path.join(__dirname , 'client' , 'login.html'));
  }
  
});




const rooms = {};

io.use((socket, next) => {
  // console.log("inside use function1");
  if(socket.handshake.query && socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token , 'rishi' , (err , decoded) => {
      //console.log("Token: ", socket.handshake.query.token);
      if(err){
        //console.log("inside use function3" , err);
        return next(new Error('Authentication error'));
      }
      //console.log("inside use function");
      socket.decoded = decoded;
      next();
    })
  }
  else{
    //console.log("inside use function2");
    
    next(new Error('Authentication error'));
  }
})



.on('connection', (socket) => {
  console.log('A user connected');
  
  
  
  socket.on('creategame' ,() => {
  
  	const roomid = makeid(6);
  	rooms[roomid] = {};
  	socket.join(roomid);
  	socket.emit("newgame" ,{roomid: roomid});
   });
 
 	socket.on('joingame' , (data) => {
		if(rooms[data.roomid] != null){
			socket.join(data.roomid);
			socket.to(data.roomid).emit("playersconnected");
			socket.emit("playersconnected");
		}
	});
  
  socket.on('p1choice' , (data) => {
    console.log("hhehe");
    console.log(data.rpsvalue)
    console.log("p1choice");
    rooms[data.roomid].p1choice = data.rpsvalue;
    socket.to(data.roomid).emit('P1choice' , data);
    if(rooms[data.roomid].p2choice != null){
      declarewinner(socket, data.roomid);
    }
  });

  socket.on('p2choice' , (data) =>{
    console.log(data.rpsvalue);
    console.log("p2choice");
    rooms[data.roomid].p2choice = data.rpsvalue;
    socket.to(data.roomid).emit('P2choice' , data);
    if(rooms[data.roomid].p1choice != null){
      declarewinner(socket, data.roomid);
    }
  })

function declarewinner(socket, roomid){
  p1choice = rooms[roomid].p1choice;
  p2choice = rooms[roomid].p2choice;
  let winner = null;
  console.log(p1choice);
  console.log(p2choice);
  console.log("hellll");
  if (p1choice == p2choice) {
      winner = "d";
  } else if (p1choice == "paper") {
      if (p2choice == "scissor") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  } else if (p1choice == "rock") {
      if (p2choice == "paper") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  } else if (p1choice == "scissor") {
      if (p2choice == "rock") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  }
  socket.to(roomid).emit('results' , {winner: winner});
  rooms[roomid].p1choice = null;
  rooms[roomid].p2choice = null;
}


  

  // Listen for messages from the client
  socket.on('message', (msg) => {
    console.log('Message received: ' + msg);
    // Broadcast the message to all connected clients
    io.emit('message', msg);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
const PORT = 3000;
httpserver.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
