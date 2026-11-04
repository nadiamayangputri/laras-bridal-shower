(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     Smooth scroll buttons (hero -> timeline, closing/footer -> top)
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.js-scroll-to').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      const target = document.querySelector(trigger.dataset.target);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', trigger.dataset.target === '#top' ? location.pathname + location.search : trigger.dataset.target);
    });
  });

  /* ------------------------------------------------------------------------
     Mood carousel (Swiper)
     ------------------------------------------------------------------------ */
  const moodEl = document.querySelector('.mood__swiper');
  let moodSwiper = null;

  if (moodEl && typeof Swiper !== 'undefined') {
    const pad = (n) => String(n).padStart(2, '0');
    const currentEl = document.querySelector('.mood__current');
    const totalEl = document.querySelector('.mood__total');

    const updateCount = (swiper) => {
      currentEl.textContent = pad(swiper.realIndex + 1);
      totalEl.textContent = pad(swiper.slides.length);
    };

    moodSwiper = new Swiper(moodEl, {
      slidesPerView: 1.3,
      spaceBetween: 16,
      speed: 600,
      grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { enabled: true },
      autoplay: { delay: 2500, disableOnInteraction: false },
      navigation: {
        prevEl: '.mood__prev',
        nextEl: '.mood__next',
      },
      pagination: {
        el: '.mood__pagination',
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 20 },
        1024: { slidesPerView: 3, spaceBetween: 24 },
      },
      on: {
        init: updateCount,
        slideChange: updateCount,
      },
    });
  }

  /* ------------------------------------------------------------------------
     Modal behaviour shared by the gallery and the timeline slideshow
     ------------------------------------------------------------------------ */
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function createModal(modal, { onOpen, onClosed }) {
    const closeBtn = modal.querySelector('.modal__close');
    let lastTrigger = null;
    let closeTimer = null;

    function open(trigger) {
      clearTimeout(closeTimer);
      lastTrigger = trigger;

      modal.hidden = false;
      onOpen(trigger);
      document.body.classList.add('is-locked');
      // arrow keys should only drive what's in the modal
      if (moodSwiper) moodSwiper.keyboard.disable();
      // next frame so the opacity transition runs
      requestAnimationFrame(() => modal.classList.add('is-open'));
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      modal.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (moodSwiper) moodSwiper.keyboard.enable();
      document.removeEventListener('keydown', onKeydown);

      const finish = () => {
        modal.hidden = true;
        onClosed();
        if (lastTrigger) lastTrigger.focus();
      };

      if (prefersReducedMotion) finish();
      else closeTimer = setTimeout(finish, 250);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        close();
        return;
      }

      // keep focus inside the dialog
      if (event.key === 'Tab') {
        const focusable = [...modal.querySelectorAll(focusableSelector)];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    modal.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', close);
    });

    return { open };
  }

  /* ------------------------------------------------------------------------
     Gallery modal
     ------------------------------------------------------------------------ */
  const galleryEl = document.getElementById('gallery-modal');

  if (galleryEl) {
    const modalImg = galleryEl.querySelector('.modal__img');
    const modalTitle = galleryEl.querySelector('.modal__title');

    const galleryModal = createModal(galleryEl, {
      onOpen(trigger) {
        modalImg.src = trigger.dataset.img;
        modalImg.alt = trigger.querySelector('img').alt;
        modalTitle.textContent = trigger.dataset.title;
        galleryEl.querySelector('.modal__content').scrollTop = 0;
      },
      onClosed() {
        modalImg.src = '';
      },
    });

    document.querySelectorAll('.gallery__item').forEach((item) => {
      item.addEventListener('click', () => galleryModal.open(item));
    });
  }

  /* ------------------------------------------------------------------------
     Timeline slideshow modal (Swiper)
     ------------------------------------------------------------------------ */
  const slideshowEl = document.getElementById('slideshow-modal');

  if (slideshowEl && typeof Swiper !== 'undefined') {
    const swiperEl = slideshowEl.querySelector('.slideshow__swiper');
    const wrapperEl = swiperEl.querySelector('.swiper-wrapper');
    const titleEl = slideshowEl.querySelector('.slideshow__title');
    let slideshow = null;

    const destroySlideshow = () => {
      if (slideshow) slideshow.destroy(true, true);
      slideshow = null;
      wrapperEl.innerHTML = '';
    };

    const slideshowModal = createModal(slideshowEl, {
      onOpen(trigger) {
        destroySlideshow();

        const title = trigger.dataset.title;
        const images = trigger.dataset.images.split(',').map((url) => url.trim());

        titleEl.textContent = title;
        images.forEach((url, index) => {
          const slide = document.createElement('div');
          slide.className = 'swiper-slide slideshow__slide';

          const img = document.createElement('img');
          img.src = url;
          img.alt = `${title}, photo ${index + 1} of ${images.length}`;

          slide.append(img);
          wrapperEl.append(slide);
        });

        // built here because Swiper can't measure itself while the modal is hidden
        slideshow = new Swiper(swiperEl, {
          slidesPerView: 1,
          loop: true,
          speed: 700,
          effect: 'fade',
          fadeEffect: { crossFade: true },
          autoplay: prefersReducedMotion ? false : { delay: 2500, disableOnInteraction: false },
          keyboard: { enabled: true },
          a11y: { enabled: true },
          navigation: {
            prevEl: slideshowEl.querySelector('.slideshow__prev'),
            nextEl: slideshowEl.querySelector('.slideshow__next'),
          },
          pagination: {
            el: slideshowEl.querySelector('.slideshow__pagination'),
            clickable: true,
          },
        });
      },
      onClosed: destroySlideshow,
    });

    document.querySelectorAll('.timeline__open').forEach((button) => {
      const title = button.closest('.timeline__item').querySelector('.timeline__title').textContent;

      button.dataset.title = title;
      button.setAttribute('aria-label', `View photos: ${title}`);
      button.addEventListener('click', () => slideshowModal.open(button));
    });
  }
})();
