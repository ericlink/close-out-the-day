// Injected script for extracting Slack saved items
// This script runs in the context of the Slack page

(function() {
    'use strict';
    
    // Configuration for extraction
    const CONFIG = {
        TIMING: {
            BEFORE_START: 1000,
            BEFORE_LOOP: 2000,
            AFTER_ELEMENT_CLICKED: 1500
        },
        SELECTORS: {
            SAVED_ITEM: 'p-saved_item',
            MESSAGE_KIT: 'div.c-message_kit__message',
            LATER_ITEMS: '[data-qa-label="later"]',
            ARCHIVE_LINKS: 'a[href*="archives"]'
        }
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    class SlackExtractor {
        constructor() {
            this.allBookmarks = [["SAVED ITEMS"]];
        }

        async extract() {
            try {
                const savedItemElements = document.querySelectorAll(`.${CONFIG.SELECTORS.SAVED_ITEM}`);
                const messageElements = document.querySelectorAll(CONFIG.SELECTORS.MESSAGE_KIT);
                
                console.log('Found saved items:', savedItemElements.length);
                
                for (let i = 0; i < Math.min(savedItemElements.length, messageElements.length); i++) {
                    try {
                        const bookmark = await this.processBookmark(messageElements[i]);
                        if (bookmark.length > 0) {
                            this.allBookmarks.push(bookmark);
                        }
                        
                        if (i < savedItemElements.length - 1) {
                            await sleep(CONFIG.TIMING.BEFORE_LOOP);
                        }
                    } catch (error) {
                        console.error(`Error processing bookmark ${i}:`, error);
                    }
                }
                
                return this.allBookmarks;
            } catch (error) {
                console.error('Extraction error:', error);
                throw error;
            }
        }

        async processBookmark(messageElement) {
            const bookmark = [];
            
            try {
                // Click to expand the message
                messageElement.click();
                await sleep(CONFIG.TIMING.AFTER_ELEMENT_CLICKED);
                
                // Extract later items
                const laterElements = document.querySelectorAll(CONFIG.SELECTORS.LATER_ITEMS);
                
                for (const laterElement of laterElements) {
                    const msg = laterElement.innerText?.replace(/\s+/g, ' ')?.trim()?.substring(0, 300);
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(laterElement.innerHTML, 'text/html');
                    const href = doc.querySelector(CONFIG.SELECTORS.ARCHIVE_LINKS)?.getAttribute('href');
                    
                    if (msg && href) {
                        bookmark.push(msg);
                        bookmark.push(href);
                    }
                }
            } catch (error) {
                console.error('Error processing individual bookmark:', error);
            }
            
            return bookmark;
        }
    }

    // Run the extraction and return results
    async function runExtraction() {
        try {
            await sleep(CONFIG.TIMING.BEFORE_START);
            const extractor = new SlackExtractor();
            const results = await extractor.extract();
            return results;
        } catch (error) {
            console.error('Extraction failed:', error);
            throw error;
        }
    }

    // Execute and return the result
    return runExtraction();
})();
