window.onload = function() {
  /* Initialise variables */
  let isDrawing = false;
  let x = 0;
  let y = 0;
  let selected_color = '#000000';
  let drawingHistory = [];
  let currentDrawingAction = [];
  let dirtyRectangles = [];

  /* Get canvas and context */
  const canvas = document.getElementById('sheet');
  var context = canvas.getContext('2d');

  /* Set the canvas size to a smaller size */
  canvas.width = 800;
  canvas.height = 600;

  /* Set the canvas resolution to a lower resolution */
  context.imageSmoothingEnabled = false;

  /* Add the event listeners for mousedown, mousemove, and mouseup */
  canvas.addEventListener('mousedown', e => {
    /* Drawing begins */
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
    currentDrawingAction = [];
  });

  canvas.addEventListener('mousemove', e => {
    /* Drawing continues */
    if (isDrawing === true) {
      currentDrawingAction.push({ x1: x, y1: y, x2: e.offsetX, y2: e.offsetY, color: selected_color });
      x = e.offsetX;
      y = e.offsetY;
      dirtyRectangles.push({ x: x, y: y, width: 10, height: 10 });
      requestAnimationFrame(redrawCanvas);
    }
  });

  window.addEventListener('mouseup', e => {
    /* Drawing ends */
    if (isDrawing === true) {
      currentDrawingAction.push({ x1: x, y1: y, x2: e.offsetX, y2: e.offsetY, color: selected_color });
      drawingHistory.push(currentDrawingAction);
      currentDrawingAction = [];
      x = 0;
      y = 0;
      isDrawing = false;
      dirtyRectangles = [];
      requestAnimationFrame(redrawCanvas);
    }
  });

  /* Initialise socket */
  var socket = io();

  /* Receiving Updates from server */
  socket.on('update_canvas', function(data) {
    let { id, x1, y1, x2, y2, color } = JSON.parse(data);
    drawingHistory.push([{ x1, y1, x2, y2, color }]);
    dirtyRectangles.push({ x: x1, y: y1, width: 10, height: 10 });
    requestAnimationFrame(redrawCanvas);
  });

  /* Function to Draw line from (x1,y1) to (x2,y2) */
  function drawLine(context, x1, y1, x2, y2, color = selected_color, from_server = false) {
    /* Send updates to server (not re-emitting those received from server) */
    if (!from_server) {
      const id = generateUniqueId();
    }

    /* Draw line with color, stroke etc.. */
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context .stroke();
    context.closePath();
  }

  function redrawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory.forEach((action) => {
      action.forEach((line) => {
        drawLine(context, line.x1, line.y1, line.x2, line.y2, line.color, true);
      });
    });
    if (currentDrawingAction.length > 0) {
      currentDrawingAction.forEach((line) => {
        drawLine(context, line.x1, line.y1, line.x2, line.y2, line.color);
      });
    }
    dirtyRectangles.forEach((rectangle) => {
      context.clearRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    });
    dirtyRectangles = [];
  }

  function undo() {
    if (drawingHistory.length > 0) {
      drawingHistory.pop();
      dirtyRectangles.push({ x: 0, y: 0, width: canvas.width, height: canvas.height });
      requestAnimationFrame(redrawCanvas);
    }
  }

  const colorPicker = document.getElementById('color-picker');
  const undoButton = document.getElementById('undo-button');

  colorPicker.addEventListener('input', (event) => {
    const selectedColor = event.target.value;
    selectColor(selectedColor);
  });

  undoButton.addEventListener('click', undo);

  function selectColor(color) {
    selected_color = color;
  }

  function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
  }
}