const images = [
        '/img/1.jpg',
        '/img/2.jpg',
        '/img/3.jpg',
        '/img/4.jpeg',
        '/img/5.jpg',
        '/img/6.jpg',
        '/img/7.jpg',
        '/img/8.jpg',
        '/img/9.jpg'
];
let currentImageIndex = 0;

function changeBackgroundImage(imageUrl) {
        $('.wrapper').addClass('fade-out');
        setTimeout(function() {
            $('.wrapper').css('--bg-image', `url(${imageUrl})`);
            setTimeout(function() {
                $('.wrapper').removeClass('fade-out');
            }, 0); 
        }, 500);
    }
    

$('#changebg').on('click', function(){
  currentImageIndex = (currentImageIndex + 1) % images.length;
  changeBackgroundImage(images[currentImageIndex]);;
});

