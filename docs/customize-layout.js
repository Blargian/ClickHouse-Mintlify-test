(function () {
    'use strict';

    // Track if we've moved the element to avoid unnecessary operations
    let hasMoved = false;

    // Function to add Beta tag to sidebar titles
    // Configure which titles should get the Beta tag
    const betaTitles = ['MongoDB'];

    function addBetaTagsToSidebarTitles() {
        // Find all h5 elements with id="sidebar-title" (querySelector gets all)
        const sidebarTitles = document.querySelectorAll('h5#sidebar-title');

        if (sidebarTitles.length === 0) {
            console.log('No sidebar title elements found');
            return false;
        }

        let addedCount = 0;

        sidebarTitles.forEach(sidebarTitle => {
            // Get just the text content without any child elements
            let titleText = '';
            for (let node of sidebarTitle.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    titleText += node.textContent;
                }
            }
            titleText = titleText.trim();

            // Check if this title should have a Beta tag
            if (!betaTitles.includes(titleText)) {
                return; // Skip this one
            }

            // Check if tag already exists
            if (sidebarTitle.querySelector('.nav-tag-pill')) {
                return; // Skip, already has tag
            }

            // Create the Beta tag pill
            const tagPillSpan = document.createElement('span');
            tagPillSpan.className = 'nav-tag-pill flex items-center w-fit';

            const tagTextSpan = document.createElement('span');
            tagTextSpan.className = 'nav-tag-pill-text px-1 py-0.5 rounded-md text-[0.65rem] leading-tight font-bold text-primary dark:text-primary-light bg-primary/10';
            tagTextSpan.setAttribute('data-nav-tag', 'Beta');
            tagTextSpan.textContent = 'Beta';

            tagPillSpan.appendChild(tagTextSpan);

            // Add a space before the tag
            sidebarTitle.appendChild(document.createTextNode(' '));
            sidebarTitle.appendChild(tagPillSpan);

            console.log('Beta tag added to sidebar title:', titleText);
            addedCount++;
        });

        return addedCount > 0;
    }

    // Move the theme toggle from the sidebar header into the bottom bar
    // next to the language picker.
    function moveThemeToggle() {
        if (document.getElementById('ch-theme-toggle-moved')) return;

        var toggle = document.querySelector('#sidebar button[aria-label="Toggle dark mode"]');
        if (!toggle) return;

        // Find the sidebar bottom bar (UL with border-t that holds the lang picker)
        var langPicker = document.getElementById('localization-select-trigger');
        var bottomBar = langPicker
            ? langPicker.closest('ul')
            : null;

        // If no language picker / bottom bar, create one at the bottom of the sidebar
        if (!bottomBar) {
            var sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            bottomBar = document.createElement('ul');
            bottomBar.className = 'px-4 py-3 w-[calc(19rem-1px)] left-0 right-0 bottom-0 bg-background-light dark:bg-background-dark border-t border-gray-200/70 dark:border-white/[0.07] text-sm';
            sidebar.appendChild(bottomBar);
        }

        // Clone the toggle so Mintlify's internal references stay intact,
        // then hide the original via CSS.
        var clone = toggle.cloneNode(true);
        clone.id = 'ch-theme-toggle-moved';

        // Mirror clicks: when clone is clicked, also click the real toggle
        clone.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggle.click();
        });

        // Create a wrapper LI for the toggle
        var li = document.createElement('li');
        li.style.cssText = 'display:flex;align-items:center;padding:4px 0;';
        li.appendChild(clone);

        // Insert at the top of the bottom bar (before language picker)
        bottomBar.insertBefore(li, bottomBar.firstChild);

        // Hide the original toggle in the sidebar header
        toggle.style.display = 'none';

        // Keep clone's visual state in sync with the real toggle
        var syncObserver = new MutationObserver(function () {
            clone.innerHTML = toggle.innerHTML;
        });
        syncObserver.observe(toggle, { childList: true, subtree: true, attributes: true });
    }

    // Try to move elements immediately
    addBetaTagsToSidebarTitles();
    moveThemeToggle();

    // Try again on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        addBetaTagsToSidebarTitles();
        moveThemeToggle();
    });

    // Try again on window load (after all resources are loaded)
    window.addEventListener('load', function() {
        addBetaTagsToSidebarTitles();
        moveThemeToggle();
    });

    // Keep watching for changes indefinitely - don't disconnect
    const observer = new MutationObserver(function(mutations) {
        // Always try to add beta tags to sidebar titles
        addBetaTagsToSidebarTitles();
        moveThemeToggle();
    });

    // Start observing the document for changes
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();