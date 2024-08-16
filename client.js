console.log("client.js executing");

const token = document.cookie
	.split(';')
	.find(cookie => cookie.includes('token'))
	.split('=')[1];

const socket = io('http://localhost:3000' , {

	query: {token: token}
});

let roomid = null;
let player1 = false;

function creategame() {
    player1 = true;
    socket.emit('creategame');
}

function joingame() {
    roomid = document.getElementById('roomid').value;
    socket.emit('joingame', {roomid: roomid});
}

socket.on("disconnect", () => {
	document.getElementById('initial').style.display = 'block';
	document.getElementById('waitingarea').style.display = 'none';
	document.getElementById('gamearea').style.display = 'none';
	console.log("jjffjjfjfjfjfjjfjjf");
	let button = document.getElementById('mybutton');
	console.log("fkkfkf");
	if(button != null){
		console.log("inside");
		document.body.removeChild(button);
	}
});	

socket.on("newgame", (data) => {
    roomid = data.roomid;
	console.log(roomid);
	document.getElementById("initial").style.display = 'none';
	document.getElementById("playagame").style.display = 'block';
	document.getElementById("waitingarea").style.display = 'block';
	document.getElementById("waitingarea").innerHTML = `waiting for opponent , please share ${roomid} to join`;
});

socket.on("playersconnected", () => {
	//console.log("playersconnected");
    document.getElementById('initial').style.display = 'none';
    document.getElementById('waitingarea').style.display = 'none';
    document.getElementById('gamearea').style.display = 'block';
})

// let buttons = document.getElementById('gamearea').querySelectorAll('button');
// buttons.forEach((button) =>{
// 	button.addEventListener('click', (event) => {
// 		// Hide all buttons
// 		buttons.forEach((btn) => {
// 		  if (btn !== event.target) {
// 			// Remove the button from the body
// 			btn.parentNode.removeChild(btn);
// 		  }
// 		});
// 	  });
// 	});

function send(rpsvalue) {


	if(player1 == true){
		console.log(rpsvalue);
		socket.emit('p1choice', {roomid: roomid, player1: true, rpsvalue: rpsvalue});

	}
	else{
		socket.emit('p2choice', {roomid: roomid, player1: false, rpsvalue: rpsvalue});
	}

}

socket.on('P1choice', (data) => {

	if(player1 == false){
		let playerChoiceButton = document.createElement('button');
		playerChoiceButton.style.display = 'block';
		playerChoiceButton.classList.add(data.rpsvalue.toString().toLowerCase());
		document.body.appendChild(playerChoiceButton);
		playerChoiceButton.textContent = "opponenet has made a choice";
		playerChoiceButton.id = 'mybutton';
	}

});

socket.on("P2choice" ,(data) =>{
	console.log("jffjjf");
	if(player1 == true){
		console.log("check2");
		let playerChoiceButton = document.createElement('button');
		playerChoiceButton.style.display = 'block';
		playerChoiceButton.classList.add(data.rpsvalue.toString().toLowerCase());
		document.body.appendChild(playerChoiceButton);
		playerChoiceButton.textContent = "opponent has made a choice";
		playerChoiceButton.id = 'mybutton';
	}

});



socket.on("results",(data)=>{
	console.log("data.winner");
    let winnerText = '';
    if(data.winner != 'd') {
        if(data.winner == 'p1' && player1) {
            winnerText = 'You win';
        } else if(data.winner == 'p1') {
            winnerText = 'You lose';
        } else if(data.winner == 'p2' && !player1) {
            winnerText = 'You win';
        } else if(data.winner == 'p2') {
            winnerText = 'You lose';
        }
    } else {
        winnerText = `It's a draw`;
    }
	console.log(winnerText);
    document.getElementById('resultsarea').innerHTML = winnerText;
});

