var socket = io();

const canvas = document.getElementById('sheet');
const colorPicker = document.getElementById('color-picker');
var context = canvas.getContext('2d');
let isDrawing = false;
let current = {
  color : 'black'
}
let drawingActions = [];
let canvasStates = [];

canvas.width = 800;
canvas.height = 600;

canvasStates.push(canvas.toDataURL());


function _mousedown(e){
  isDrawing = true;
  current.x = e.offsetX || e.touches[0].offsetX
  current.y = e.offsetY || e.touches[0].offsetY
}

function _mouseup(e){
  if(!isDrawing){
    return
  }
  isDrawing = false;
  drawingActions.push({
    x0: current.x,
    y0: current.y,
    x1: e.offsetX || e.touches[0].offsetX,
    y1: e.offsetY || e.touches[0].offsetY,
    color: current.color
  });
  canvasStates.push(canvas.toDataURL());
}

function _drawLine(x0, y0, x1, y1, color, emit){
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
  context.closePath();

  if(!emit){
    return
  }

  const w = canvas.width;
  const h = canvas.height;

  socket.emit("drawing", {
    x0 : x0 / w,
    y0 : y0 / h,
    x1 : x1 / w,
    y1 : y1 / h,
    color
  })
}

function _mousemove(e){
  if(!isDrawing){
    return;
  }
  _drawLine(
    current.x,
    current.y,
    e.offsetX|| e.touches[0].offsetX,
    e.offsetY || e.touches[0].offsetY,
    current.color,
    true
  );
  current.x = e.offsetX || e.touches[0].offsetX
  current.y = e.offsetY || e.touches[0].offsetY
}

function _throttle(callback, delay){
  var previousCall = new Date().getTime();
  return function(){
    var time = new Date().getTime();

    if(time - previousCall >= delay){
      previousCall = time;
      callback.apply(null, arguments);
    }
  }
}

function _drawevent(data){
  var w = canvas.width;
  var h = canvas.height;
  _drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color)
}

function _undo(){
  if(canvasStates.length > 0){
    drawingActions.pop();
    if(canvasStates.length == 1){
      context.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      var img = new Image();
      img.src = canvasStates[canvasStates.length - 2];
      img.onload = function(){
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      }
    }
    canvasStates.pop();
    socket.emit("undo", canvasStates); // send updated canvasStates to the server
  }
}

socket.on("undo", (canvasStates) => {
  canvasStates = canvasStates; // update canvasStates array
  // redraw the canvas using the updated canvasStates
  var img = new Image();
  img.src = canvasStates[canvasStates.length - 1];
  img.onload = function(){
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
  }
});

colorPicker.addEventListener('input', (event) => {
  current.color = event.target.value;
});

socket.on("drawing", _drawevent)

const undoButton = document.getElementById('undo-button');
undoButton.addEventListener('click', _undo);

canvas.addEventListener("mousedown", _mousedown, false)
canvas.addEventListener("mouseup", _mouseup, false)
canvas.addEventListener("mouseout", _mouseup, false)
canvas.addEventListener("mousemove", _throttle(_mousemove, 10), false)

canvas.addEventListener("touchstart", _mousedown, false)
canvas.addEventListener("touchend", _mouseup, false)
canvas.addEventListener("touchcancel", _mouseup, false)
canvas.addEventListener("touchmove", _throttle(_mousemove, 10), false)