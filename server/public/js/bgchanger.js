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
    
        // Wait for the fade-out animation to complete (500ms)
        setTimeout(function() {
            // Change the background image
            $('.wrapper').css('--bg-image', `url(${imageUrl})`);
    
            // Remove the fade-out class to fade in the new image
            setTimeout(function() {
                $('.wrapper').removeClass('fade-out');
            }, 0); // remove the class immediately after changing the image
        }, 500); // adjust the timeout value to match the animation duration
    }
    

$('#changebg').on('click', function(){
        currentImageIndex = (currentImageIndex + 1) % images.length;
        changeBackgroundImage(images[currentImageIndex]);;
});

