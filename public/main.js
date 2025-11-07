// Simple JavaScript for header scroll effect
        window.addEventListener('scroll', function() {
            const header = document.querySelector('header');
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
                header.style.background = 'rgba(255, 249, 245, 0.98)';
            } else {
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                header.style.background = 'rgba(255, 249, 245, 0.95)';
            }
        });