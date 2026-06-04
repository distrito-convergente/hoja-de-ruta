/**
 * DCC-ACT Brochure - Web Book Reader
 * Integrates an interactive 3D book layout for screen view
 * while preserving the native print layout of the brochure.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Only activate the book layout when displaying on screen
  if (!window.matchMedia('screen').matches) {
    return;
  }

  // Get 1mm to px factor dynamically to ensure 100% accurate layout scaling
  let mmToPx = 3.779527559; // Fallback standard
  const testDiv = document.createElement('div');
  testDiv.style.width = '100mm';
  testDiv.style.position = 'absolute';
  testDiv.style.visibility = 'hidden';
  document.body.appendChild(testDiv);
  if (testDiv.offsetWidth > 0) {
    mmToPx = testDiv.offsetWidth / 100;
  }
  document.body.removeChild(testDiv);

  // Titles for each page in the brochure (to display in the progress indicator)
  const PAGE_TITLES = [
    "Portada", // 0
    "Inicio", // 1
    "Portadilla", // 2
    "Créditos", // 3
    "Contenido", // 4
    "Otras Sendas", // 5
    "Editorial", // 6
    "DCC-ACT", // 7
    "Principios", // 8
    "Nodos Territoriales", // 9
    "Marco Normativo", // 10
    "Gobernanza", // 11
    "Ejes Estratégicos", // 12
    "Procesos Convergentes", // 13
    "Procesos Convergentes", // 14
    "Procesos Convergentes", // 15
    "Procesos Convergentes", // 16
    "Grupo Gestor del DCC-ACT", // 17
    "Cierre", // 18
    "Contraportada" // 19
  ];

  // Save the original pages and their parent container
  const originalPages = Array.from(document.querySelectorAll('.page'));
  if (originalPages.length === 0) return;

  const originalParent = originalPages[0].parentNode;
  const originalNextSibling = originalPages[0].nextSibling;

  // State variables
  let currentSpread = 0; // 0 to 10 for double-page spreads
  let currentPageIndex = 0; // 0 to 19 for single-page view
  let viewMode = window.innerWidth < 768 ? 'single' : 'double';
  let currentTheme = 'theme-dark';
  let sheets = [];
  let userInteracted = false;

  // Create book HTML structure
  const container = document.createElement('div');
  container.className = `book-container ${currentTheme} ${viewMode === 'single' ? 'single-view' : ''}`;



  const viewport = document.createElement('div');
  viewport.className = 'book-viewport';
  container.appendChild(viewport);

  const wrapper = document.createElement('div');
  wrapper.className = 'book-wrapper';
  viewport.appendChild(wrapper);

  const book3D = document.createElement('div');
  book3D.className = 'book-3d';
  wrapper.appendChild(book3D);

  // Navigation buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'book-nav-btn prev-btn';
  prevBtn.setAttribute('aria-label', 'Página anterior');
  prevBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
  container.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'book-nav-btn next-btn';
  nextBtn.setAttribute('aria-label', 'Página siguiente');
  nextBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>`;
  container.appendChild(nextBtn);

  // Bottom Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'book-toolbar';
  container.appendChild(toolbar);

  // Toolbar left section (Page indicators)
  const toolbarLeft = document.createElement('div');
  toolbarLeft.className = 'toolbar-left';
  const pageIndicator = document.createElement('span');
  pageIndicator.className = 'page-indicator';
  toolbarLeft.appendChild(pageIndicator);
  toolbar.appendChild(toolbarLeft);

  // Toolbar center section (Slider progress)
  const toolbarCenter = document.createElement('div');
  toolbarCenter.className = 'toolbar-center';
  const pageSlider = document.createElement('input');
  pageSlider.type = 'range';
  pageSlider.className = 'page-slider';
  toolbarCenter.appendChild(pageSlider);
  toolbar.appendChild(toolbarCenter);

  // Toolbar right section (Actions)
  const toolbarRight = document.createElement('div');
  toolbarRight.className = 'toolbar-right';

  // View Mode Toggle Button
  const viewModeBtn = document.createElement('button');
  viewModeBtn.className = 'toolbar-btn view-mode-btn';
  viewModeBtn.title = 'Cambiar entre página única / doble';
  viewModeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>`;
  toolbarRight.appendChild(viewModeBtn);

  // Print Button
  const printBtn = document.createElement('button');
  printBtn.className = 'toolbar-btn print-btn';
  printBtn.title = 'Imprimir brochure / Guardar PDF';
  printBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
  toolbarRight.appendChild(printBtn);

  // Fullscreen Button
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'toolbar-btn fullscreen-btn';
  fullscreenBtn.title = 'Pantalla completa';
  fullscreenBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
  toolbarRight.appendChild(fullscreenBtn);

  toolbar.appendChild(toolbarRight);

  // Wrap pages into sheets
  const totalPages = originalPages.length;
  const totalSheets = Math.ceil(totalPages / 2);

  for (let i = 0; i < totalPages; i += 2) {
    const sheet = document.createElement('div');
    sheet.className = 'book-sheet';
    sheet.dataset.index = Math.floor(i / 2);

    // Front page (index i)
    const frontFace = document.createElement('div');
    frontFace.className = 'book-sheet-face face-front';
    // Clone page node to keep references clean or append direct
    frontFace.appendChild(originalPages[i]);
    sheet.appendChild(frontFace);

    // Back page (index i + 1)
    const backFace = document.createElement('div');
    backFace.className = 'book-sheet-face face-back';
    if (i + 1 < totalPages) {
      backFace.appendChild(originalPages[i + 1]);
    } else {
      // Empty page if odd number
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'page page-blank';
      backFace.appendChild(emptyDiv);
    }
    sheet.appendChild(backFace);

    book3D.appendChild(sheet);
    sheets.push(sheet);
  }

  // Inject book container into body
  document.body.appendChild(container);
  document.body.classList.add('book-mode-active');

  // Handle toolbar hide/show on inactivity
  let toolbarTimeout;
  function resetToolbarTimer() {
    toolbar.classList.remove('hidden');
    clearTimeout(toolbarTimeout);
    toolbarTimeout = setTimeout(() => {
      if (userInteracted) {
        toolbar.classList.add('hidden');
      }
    }, 3500);
  }

  // Set initial slider range properties
  function updateSliderRange() {
    if (viewMode === 'double') {
      pageSlider.min = '0';
      pageSlider.max = (totalSheets).toString(); // 0 to 10
      pageSlider.value = currentSpread.toString();
    } else {
      pageSlider.min = '0';
      pageSlider.max = (totalPages - 1).toString(); // 0 to 19
      pageSlider.value = currentPageIndex.toString();
    }
  }

  // Update layout and details based on active indices
  function updateBookView() {
    updateSliderRange();

    if (viewMode === 'double') {
      container.classList.remove('single-view');
      
      // Update sheet rotations and z-indices for double spread
      sheets.forEach((sheet, idx) => {
        if (idx < currentSpread) {
          sheet.classList.add('flipped');
          // Descending or ascending based on flipped state
          sheet.style.zIndex = idx;
        } else {
          sheet.classList.remove('flipped');
          sheet.style.zIndex = totalSheets - idx;
        }

        // Active sheets raise on top during transition
        if (idx === currentSpread - 1) {
          sheet.style.zIndex = totalSheets + 2;
          sheet.classList.add('active-back');
          sheet.classList.remove('active-front');
        } else if (idx === currentSpread) {
          sheet.style.zIndex = totalSheets + 2;
          sheet.classList.add('active-front');
          sheet.classList.remove('active-back');
        } else {
          sheet.classList.remove('active-front', 'active-back');
        }
      });

      // Update indicators
      const isMobile = window.innerWidth < 768;
      if (currentSpread === 0) {
        pageIndicator.innerText = isMobile ? `Pág. 1 de ${totalPages}` : `Portada (1 / ${totalPages})`;
      } else if (currentSpread === totalSheets) {
        pageIndicator.innerText = isMobile ? `Pág. ${totalPages} de ${totalPages}` : `Contraportada (${totalPages} / ${totalPages})`;
      } else {
        const leftPage = 2 * currentSpread;
        const rightPage = 2 * currentSpread + 1;
        if (isMobile) {
          pageIndicator.innerText = `Págs. ${leftPage}-${rightPage}`;
        } else {
          const leftTitle = PAGE_TITLES[leftPage - 1] || "Página";
          pageIndicator.innerText = `Págs. ${leftPage}-${rightPage}: ${leftTitle}`;
        }
      }

      // Button states
      prevBtn.style.visibility = currentSpread === 0 ? 'hidden' : 'visible';
      nextBtn.style.visibility = currentSpread === totalSheets ? 'hidden' : 'visible';
    } else {
      container.classList.add('single-view');

      // Update sheets for single-page view
      const activeSheetIdx = Math.floor(currentPageIndex / 2);
      const isFront = currentPageIndex % 2 === 0;

      sheets.forEach((sheet, idx) => {
        if (idx === activeSheetIdx) {
          sheet.classList.add('active-sheet');
          const frontFace = sheet.querySelector('.face-front');
          const backFace = sheet.querySelector('.face-back');
          
          if (isFront) {
            frontFace.classList.add('active-face');
            backFace.classList.remove('active-face');
          } else {
            backFace.classList.add('active-face');
            frontFace.classList.remove('active-face');
          }
        } else {
          sheet.classList.remove('active-sheet');
          sheet.querySelector('.face-front').classList.remove('active-face');
          sheet.querySelector('.face-back').classList.remove('active-face');
        }
      });

      // Update indicators
      const isMobileSingle = window.innerWidth < 768;
      if (isMobileSingle) {
        pageIndicator.innerText = `Pág. ${currentPageIndex + 1} de ${totalPages}`;
      } else {
        const title = PAGE_TITLES[currentPageIndex] || "Página";
        pageIndicator.innerText = `Pág. ${currentPageIndex + 1} de ${totalPages}: ${title}`;
      }

      // Button states
      prevBtn.style.visibility = currentPageIndex === 0 ? 'hidden' : 'visible';
      nextBtn.style.visibility = currentPageIndex === totalPages - 1 ? 'hidden' : 'visible';
    }

    resizeBook();
  }

  // Navigation actions
  function goNext() {
    userInteracted = true;
    resetToolbarTimer();
    if (viewMode === 'double') {
      if (currentSpread < totalSheets) {
        currentSpread++;
        // Map spread index to page index for sync
        currentPageIndex = currentSpread === totalSheets ? totalPages - 1 : (2 * currentSpread - 1);
        updateBookView();
      }
    } else {
      if (currentPageIndex < totalPages - 1) {
        currentPageIndex++;
        updateBookView();
      }
    }
  }

  function goPrev() {
    userInteracted = true;
    resetToolbarTimer();
    if (viewMode === 'double') {
      if (currentSpread > 0) {
        currentSpread--;
        currentPageIndex = currentSpread === 0 ? 0 : (2 * currentSpread - 1);
        updateBookView();
      }
    } else {
      if (currentPageIndex > 0) {
        currentPageIndex--;
        updateBookView();
      }
    }
  }

  // Resize and scale logic to guarantee perfect viewport fit
  function resizeBook() {
    const rect = container.getBoundingClientRect();
    
    // Calculate padding
    const isMobileLayout = window.innerWidth < 768 || viewMode === 'single';
    const padX = isMobileLayout ? 20 : 120;
    const padY = isMobileLayout ? 180 : 160;

    const availableWidth = rect.width - padX;
    const availableHeight = rect.height - padY;

    // Fixed page base height & width in millimeter units
    const bookW = isMobileLayout ? 200 : 400; // in mm
    const bookH = 200; // in mm

    // Convert mm dimensions to pixels for layout sizes to prevent Firefox Flexbox unit translation bugs
    const bookW_px = bookW * mmToPx;
    const bookH_px = bookH * mmToPx;

    wrapper.style.width = `${bookW_px}px`;
    wrapper.style.height = `${bookH_px}px`;

    const scaleX = availableWidth / bookW_px;
    const scaleY = availableHeight / bookH_px;
    const scale = Math.min(scaleX, scaleY, 1.1); // Limit scaling above 1.1x

    book3D.style.width = '100%';
    book3D.style.height = '100%';
    wrapper.style.transform = `scale(${scale})`;
  }

  // Fullscreen support
  function toggleFullscreen() {
    userInteracted = true;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error going fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Toggle single vs double page view
  function toggleViewMode() {
    userInteracted = true;
    if (viewMode === 'double') {
      viewMode = 'single';
      // Sync page index from current spread
      currentPageIndex = currentSpread === 0 ? 0 : (currentSpread === totalSheets ? totalPages - 1 : (2 * currentSpread - 1));
      viewModeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V6h14v12z"/></svg>`;
    } else {
      viewMode = 'double';
      // Sync spread from current page index
      currentSpread = Math.floor((currentPageIndex + 1) / 2);
      viewModeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>`;
    }
    updateBookView();
  }



  // Handle swipes/drags
  let startX = 0;
  container.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  container.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  }, { passive: true });

  // Event Listeners
  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);

  // Slider change event
  pageSlider.addEventListener('input', e => {
    userInteracted = true;
    resetToolbarTimer();
    const val = parseInt(e.target.value);
    if (viewMode === 'double') {
      currentSpread = val;
      currentPageIndex = val === 0 ? 0 : (val === totalSheets ? totalPages - 1 : (2 * val - 1));
    } else {
      currentPageIndex = val;
    }
    updateBookView();
  });

  // Hotkey navigation
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  });

  // Action buttons events
  viewModeBtn.addEventListener('click', toggleViewMode);
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  printBtn.addEventListener('click', () => {
    userInteracted = true;
    window.print();
  });

  // Auto handle single vs double mode on resize
  window.addEventListener('resize', () => {
    const shouldBeSingle = window.innerWidth < 768;
    if (shouldBeSingle && viewMode === 'double') {
      viewMode = 'single';
      currentPageIndex = currentSpread === 0 ? 0 : (currentSpread === totalSheets ? totalPages - 1 : (2 * currentSpread - 1));
      container.classList.add('single-view');
      viewModeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V6h14v12z"/></svg>`;
    } else if (!shouldBeSingle && viewMode === 'single' && window.innerWidth >= 768 && !userInteracted) {
      // Return to double on large viewport if user hasn't explicitly set single page mode
      viewMode = 'double';
      currentSpread = Math.floor((currentPageIndex + 1) / 2);
      container.classList.remove('single-view');
      viewModeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>`;
    }
    updateBookView();
  });

  // Watch for cursor movements to reset toolbar timeout
  container.addEventListener('mousemove', resetToolbarTimer);
  container.addEventListener('click', resetToolbarTimer);

  // Initialize view
  updateBookView();
  resetToolbarTimer();

  // Support native printing:
  // Before printing, tear down the book wrappers so pages are printed exactly as they are in index.html.
  // After printing, reconstruct the book container.
  window.addEventListener('beforeprint', () => {
    document.body.classList.remove('book-mode-active');
    
    // Put pages back as direct children of the original parent
    originalPages.forEach(page => {
      originalParent.insertBefore(page, originalNextSibling);
    });

    // Remove book container
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // When print dialog is closed, restore book view
  window.addEventListener('afterprint', () => {
    // Add a slight delay to allow the browser to fully restore standard screen layout and viewport sizes
    setTimeout(() => {
      // Re-wrap pages
      sheets.forEach((sheet, idx) => {
        const frontFace = sheet.querySelector('.face-front');
        const backFace = sheet.querySelector('.face-back');
        
        const pIdx = idx * 2;
        frontFace.appendChild(originalPages[pIdx]);
        if (pIdx + 1 < totalPages) {
          backFace.appendChild(originalPages[pIdx + 1]);
        }
      });

      document.body.appendChild(container);
      document.body.classList.add('book-mode-active');
      updateBookView();
    }, 150);
  });
});
