// Injected script for extracting Slack saved items
// This script runs in the context of the Slack page and uses the exact same logic as slack-bookmark-extractor.js

(function() {
    'use strict';
    
    /**
     * Configuration constants for timing and styling
     */
    const CONFIG = {
        TIMING: {
            BEFORE_START: 2000,
            BEFORE_LOOP: 3000,
            get AFTER_FINISHED() { return this.BEFORE_START; },
            get AFTER_ELEMENT_CLICKED() { return this.BEFORE_LOOP - 1000; }
        },
        ZOOM_LEVEL: 0.05,
        SELECTORS: {
            ELEMENTS_TO_RESIZE: [
                'body', 'html', '.p-client_container', '.p-ia4_client_container', 
                '.p-ia4_client', '.p-theme_background', '.p-client_workspace_wrapper', 
                '.p-client_workspace', '.p-client_workspace__layout', '.p-view_contents'
            ],
            SAVED_ITEM: 'p-saved_item',
            MESSAGE_KIT: 'div.c-message_kit__message',
            LATER_ITEMS: '[data-qa-label="later"]',
            VIEW_HEADER: 'div.p-view_header',
            SENDER_NAME: 'span[data-qa="message_sender_name"]',
            AUTO_DIR_SPAN: 'span[dir="auto"]',
            TRUNCATE_SPANS: 'span.c-truncate',
            ARCHIVE_LINKS: 'a[href*="archives"]'
        }
    };

    /**
     * Utility functions for data processing
     */
    const Utils = {
        /**
         * Sleep for specified milliseconds
         */
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

        /**
         * Remove duplicates from array based on first element
         */
        dedupe: (data) => {
            const seen = new Set();
            return data.filter(item => {
                if (!seen.has(item[0])) {
                    seen.add(item[0]);
                    return true;
                }
                return false;
            });
        },

        /**
         * Convert array data to outline format
         */
        arrayToOtl: (data) => {
            return data.map(row =>
                row
                    .map(String)
                    .map(v => v.replaceAll('"', '""'))
                    .map(v => v.replaceAll('Saved for later ', '\r\n\t'))
                    .map(v => `${v}`)
                    .join('\r\n\t\t')
            ).join('\r\n\r\n');
        }
    };

    /**
     * UI manipulation functions
     */
    const UI = {
        /**
         * Resize elements to full viewport
         */
        resizeElements: () => {
            CONFIG.SELECTORS.ELEMENTS_TO_RESIZE.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.setProperty('max-height', '100%', 'important');
                    element.style.setProperty('height', '100%', 'important');
                    element.style.setProperty('max-width', '100%', 'important');
                    element.style.setProperty('width', '100%', 'important');
                }
            });
        },

        /**
         * Set zoom level
         */
        setZoom: () => {
            document.body.style.zoom = CONFIG.ZOOM_LEVEL;
        }
    };

    /**
     * Bookmark processing functions
     */
    const BookmarkProcessor = {
        /**
         * Extract message and link from later element
         */
        extractFromLaterElement: (laterElement) => {
            const msg = laterElement.innerText?.replace(/\s+/g, ' ')?.trim()?.substring(0, 300);
            const parser = new DOMParser();
            const doc = parser.parseFromString(laterElement.innerHTML, 'text/html');
            const href = doc.querySelector(CONFIG.SELECTORS.ARCHIVE_LINKS)?.getAttribute('href');
            return { msg, href };
        },

        /**
         * Process a single bookmark item
         */
        processBookmark: async (divElement, messageElement) => {
            const bookmark = [];
            
            // Click the message element to view the thread
            messageElement.click();
            
            // Wait for content to load
            await Utils.sleep(CONFIG.TIMING.AFTER_ELEMENT_CLICKED);
            
            // Extract later items
            const laterElements = document.querySelectorAll(CONFIG.SELECTORS.LATER_ITEMS);
            
            for (const laterElement of laterElements) {
                const { msg, href } = BookmarkProcessor.extractFromLaterElement(laterElement);
                if (msg && href) {
                    bookmark.push(msg);
                    bookmark.push(href);
                }
            }
            
            return bookmark;
        }
    };

    /**
     * Main bookmark extraction class
     */
    class SlackBookmarkExtractor {
        constructor() {
            this.allBookmarks = [["SAVED ITEMS"]];
        }

        /**
         * Initialize the extraction process
         */
        async init() {
            // Setup UI
            UI.resizeElements();
            UI.setZoom();
            
            // Wait before starting
            await Utils.sleep(CONFIG.TIMING.BEFORE_START);
            
            // Start extraction
            await this.extractBookmarks();
            
            // Return the results instead of just logging them
            return this.getResults();
        }

        /**
         * Extract all bookmarks
         */
        async extractBookmarks() {
            const savedItemElements = document.querySelectorAll(`.${CONFIG.SELECTORS.SAVED_ITEM}`);
            const messageElements = document.querySelectorAll(CONFIG.SELECTORS.MESSAGE_KIT);
            
            console.log('Number of bookmarks:', savedItemElements.length);
            
            // Emit initial progress event
            this.emitProgressEvent(0, savedItemElements.length, 'Starting extraction...');
            
            for (let i = 0; i < savedItemElements.length; i++) {
                // Emit progress before processing each bookmark
                this.emitProgressEvent(i, savedItemElements.length, `Processing bookmark ${i + 1}/${savedItemElements.length}...`);
                
                const bookmark = await BookmarkProcessor.processBookmark(
                    savedItemElements[i], 
                    messageElements[i]
                );
                
                this.allBookmarks.push(bookmark);
                
                // Emit progress after processing
                const itemsExtracted = this.allBookmarks.length - 1; // -1 for header
                this.emitProgressEvent(i + 1, savedItemElements.length, `Extracted ${itemsExtracted} items...`);
                
                // Wait between iterations
                if (i < savedItemElements.length - 1) {
                    await Utils.sleep(CONFIG.TIMING.BEFORE_LOOP);
                }
            }
            
            // Emit final processing event
            this.emitProgressEvent(savedItemElements.length, savedItemElements.length, 'Processing results...');
            
            // Process final results
            await this.finalize();
        }

        /**
         * Finalize and output results
         */
        async finalize() {
            await Utils.sleep(CONFIG.TIMING.AFTER_FINISHED);
            
            this.uniqueBookmarks = Utils.dedupe(this.allBookmarks);
            console.log(Utils.arrayToOtl(this.uniqueBookmarks));
        }

        /**
         * Emit progress event for real-time updates
         */
        emitProgressEvent(current, total, message) {
            const event = new CustomEvent('slackExtractionProgress', {
                detail: {
                    current,
                    total,
                    message,
                    percentage: Math.round((current / total) * 100)
                }
            });
            document.dispatchEvent(event);
        }

        /**
         * Get the processed results for return to the extension
         */
        getResults() {
            return {
                rawData: this.allBookmarks,
                uniqueData: this.uniqueBookmarks,
                formattedOutput: Utils.arrayToOtl(this.uniqueBookmarks)
            };
        }
    }

    /**
     * Start the extraction process and return results
     */
    async function runExtraction() {
        try {
            const extractor = new SlackBookmarkExtractor();
            const results = await extractor.init();
            return results;
        } catch (error) {
            console.error('Error during bookmark extraction:', error);
            throw error;
        }
    }

    // Execute and return the result
    return runExtraction();
})();