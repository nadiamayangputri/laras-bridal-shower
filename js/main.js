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
    const dialog = galleryEl.querySelector('.modal__dialog');
    const letterPanel = galleryEl.querySelector('.modal__letter');
    const letterLink = galleryEl.querySelector('.modal__letter-link');
    const letterImg = galleryEl.querySelector('.modal__letter-img');

    const galleryModal = createModal(galleryEl, {
      onOpen(trigger) {
        // "From Ale" -> "from Ale"
        const from = trigger.querySelector('.gallery__caption').textContent.trim().replace(/^From/, 'from');
        const letter = trigger.dataset.letter;

        modalImg.src = trigger.dataset.img;
        modalImg.alt = trigger.querySelector('img').alt;
        galleryEl.setAttribute('aria-label', `Letter to the bride ${from}`);

        // a card without a letter yet just shows the photo
        dialog.classList.toggle('has-no-letter', !letter);
        letterPanel.hidden = !letter;
        if (letter) {
          letterImg.src = letter;
          letterImg.alt = `Handwritten letter ${from}`;
          letterLink.href = letter;
        }
        letterPanel.scrollTop = 0;
        dialog.scrollTop = 0;
      },
      onClosed() {
        modalImg.src = '';
        letterImg.src = '';
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

    // load the current photo plus the ones either side of it
    const loadNearby = (swiper) => {
      const { slides, activeIndex } = swiper;

      [-1, 0, 1, 2].forEach((offset) => {
        const slide = slides[(activeIndex + offset + slides.length) % slides.length];
        const img = slide && slide.querySelector('img[data-src]');
        if (!img) return;

        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    };

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

          // src is set by loadNearby so a big folder doesn't download all at once
          const img = document.createElement('img');
          img.dataset.src = url;
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
            // too many dots won't fit under the image, so show "3 / 46" instead
            type: images.length > 8 ? 'fraction' : 'bullets',
            clickable: true,
          },
          on: {
            init: loadNearby,
            slideChange: loadNearby,
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

  /* ------------------------------------------------------------------------
     Background music
     Browsers usually block sound until the visitor interacts with the page,
     so if autoplay is refused it starts on their first click, tap or key.
     ------------------------------------------------------------------------ */
  const audio = document.querySelector('.music__audio');
  const musicToggle = document.querySelector('.music-toggle');

  if (audio && musicToggle) {
    // browsers only allow sound after some of these (phones need the end of a tap),
    // so listen for all of them until one works
    const unlockEvents = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    let pausedByVisitor = false;

    const updateToggle = () => {
      const playing = !audio.paused;
      musicToggle.classList.toggle('is-playing', playing);
      musicToggle.setAttribute('aria-pressed', String(playing));
      musicToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    };

    const removeUnlock = () => unlockEvents.forEach((type) => document.removeEventListener(type, unlock));

    const play = () => audio.play().then(removeUnlock).catch(() => {});

    const video = document.querySelector('.video__player');
    let pausedForVideo = false;

    // first interaction anywhere on the page starts the music
    // (not when it's the toggle itself, or the video, which has its own sound)
    function unlock(event) {
      if (pausedByVisitor || musicToggle.contains(event.target)) return;
      if (video && (video.contains(event.target) || !video.paused)) return;
      play();
    }

    // the music steps aside while the video plays, then comes back
    if (video) {
      video.addEventListener('play', () => {
        if (!audio.paused) {
          pausedForVideo = true;
          audio.pause();
        }
      });

      // bring the music back afterwards, unless the visitor had turned it off
      // (this also starts it if the browser blocked autoplay and the video came first)
      const resumeAfterVideo = () => {
        if (!pausedByVisitor) play();
        pausedForVideo = false;
      };

      video.addEventListener('pause', resumeAfterVideo);
      video.addEventListener('ended', resumeAfterVideo);
    }

    audio.volume = 0.6;
    audio.addEventListener('play', updateToggle);
    audio.addEventListener('pause', updateToggle);

    musicToggle.addEventListener('click', () => {
      removeUnlock();
      if (audio.paused) {
        pausedByVisitor = false;
        pausedForVideo = false;
        if (video && !video.paused) video.pause();
        play();
      } else {
        pausedByVisitor = true;
        audio.pause();
      }
    });

    unlockEvents.forEach((type) => document.addEventListener(type, unlock));
    play();
  }
})();
