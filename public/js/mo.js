class Heart extends mojs.CustomShape {
  getShape () { return '<path d="M92.6 7.4c-10-9.9-26-9.9-35.9 0l-4.4 4.3a3.4 3.4 0 0 1-4.7 0l-4.3-4.3c-10-9.9-26-9.9-35.9 0a25 25 0 0 0 0 35.5l22.4 22.2 13.5 13.4a9.5 9.5 0 0 0 13.4 0L70.2 65 92.6 43a25 25 0 0 0 0-35.5z"/>'; }
  getLength () { return 200; } // optional
}
mojs.addShape( 'heart', Heart );
const container = document.getElementsByClassName('message-area')
const heartPop = new mojs.ShapeSwirl({
  parent: container,
  shape: 'heart',
  y: { 0: -150 },
  radius: 8,
  pathScale: .5,
  duration: 1000,
  swirlFrequency: 1,
  left:0,
  top:0,
});
const burst = new mojs.Burst({
  parent: container,
  left:0,
  top:0,
  radius:   { 25 : 75 },
  count:    10,
  duration: 2000,
  children: {
    shape: [ 'circle', 'polygon' ],
    fill:  [ '#333', 'magenta', 'purple' ],
    angle: { 0: 180 },
    degreeShift: 'rand(-360, 360)',
    delay: 'stagger(0, 25)'
  }
});
