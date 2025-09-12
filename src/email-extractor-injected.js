// Injected script for extracting Gmail starred emails
// Based on gmail-starred.js logic but adapted for chrome extension injection

(function() {
    'use strict';
    
    /**
     * Configuration constants for timing and selectors
     */
    const CONFIG = {
        TIMING: {
            CLICK_DELAY: 1000,
            FINAL_WAIT: 2000
        },
        SELECTORS: {
            MAIN_CONTAINER: '[role="main"]',
            EMAIL_ROWS: 'tr[role="row"]',
            ALTERNATIVE_ROWS: '.zA',
            CONVERSATION_LIST: '[gh="tl"]'
        }
    };

    /**
     * Utility functions
     */
    const Utils = {
        /**
         * Sleep for specified milliseconds
         */
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

        /**
         * Extract email subject from URL
         */
        extractSubjectFromUrl: (url) => {
            try {
                // Gmail URLs contain the email ID after #inbox/ or similar
                // We'll need to extract meaningful info from the current page
                const urlParams = new URLSearchParams(url.split('#')[1] || '');
                return url; // For now, just return the URL
            } catch (error) {
                return url;
            }
        },

        /**
         * Get email subject from page content
         */
        getEmailSubject: () => {
            // Try different selectors for email subject
            const selectors = [
                'h2[data-legacy-thread-id]',
                '.hP',
                '[data-subject]',
                '.bog',
                '.a4W', // Gmail subject line
                '.Hy7 .y6', // Alternative subject
                '[data-tooltip*="subject"]',
                '.g2 .go .gD' // Subject in conversation view
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            
            // Try to get from title attribute or aria-label
            const titleElements = document.querySelectorAll('[title], [aria-label]');
            for (const el of titleElements) {
                const title = el.getAttribute('title') || el.getAttribute('aria-label');
                if (title && title.length > 10 && title.length < 200) {
                    return title;
                }
            }
            
            return 'Email subject not found';
        },

        /**
         * Get sender information
         */
        getSenderInfo: () => {
            const selectors = [
                '.go .g2',
                '.gD',
                '[email]',
                '.yW .yP', // Sender name in list
                '.g2 .yX .yW', // Sender in conversation
                '.yP .yW' // Alternative sender
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            
            return 'Sender not found';
        },

        /**
         * Get email info from row element before clicking
         */
        getEmailInfoFromRow: (row) => {
            const info = { subject: '', sender: '' };
            
            // Try to get subject from row
            const subjectElements = row.querySelectorAll('.bog, .y6, .a4W, [data-subject]');
            for (const el of subjectElements) {
                if (el.textContent.trim()) {
                    info.subject = el.textContent.trim();
                    break;
                }
            }
            
            // Try to get sender from row
            const senderElements = row.querySelectorAll('.yW, .g2, .gD, [email]');
            for (const el of senderElements) {
                if (el.textContent.trim()) {
                    info.sender = el.textContent.trim();
                    break;
                }
            }
            
            return info;
        }
    };

    /**
     * Main email extraction class
     */
    class GmailStarredExtractor {
        constructor() {
            this.extractedEmails = [["STARRED EMAILS", "URL", "SENDER"]]; // Header row
            this.urls = [];
        }

        /**
         * Initialize the extraction process
         */
        async init() {
            console.log('Gmail extractor starting...');
            console.log('Current URL:', window.location.href);
            
            // Try multiple ways to find email containers
            let rows = [];
            
            // Method 1: Look for main container with rows
            const mainDiv = document.querySelector(CONFIG.SELECTORS.MAIN_CONTAINER);
            if (mainDiv) {
                rows = Array.from(mainDiv.querySelectorAll(CONFIG.SELECTORS.EMAIL_ROWS));
                console.log(`Method 1: Found ${rows.length} email rows in main container`);
            }
            
            // Method 2: Look for alternative row selectors
            if (rows.length === 0) {
                rows = Array.from(document.querySelectorAll(CONFIG.SELECTORS.ALTERNATIVE_ROWS));
                console.log(`Method 2: Found ${rows.length} email rows using .zA selector`);
            }
            
            // Method 3: Look for conversation list
            if (rows.length === 0) {
                const conversationList = document.querySelector(CONFIG.SELECTORS.CONVERSATION_LIST);
                if (conversationList) {
                    rows = Array.from(conversationList.querySelectorAll('tr'));
                    console.log(`Method 3: Found ${rows.length} email rows in conversation list`);
                }
            }
            
            // Method 4: Look for any clickable email elements
            if (rows.length === 0) {
                rows = Array.from(document.querySelectorAll('[jsaction*="click"]')).filter(el => 
                    el.closest('tr') && el.textContent.trim().length > 0
                );
                console.log(`Method 4: Found ${rows.length} clickable email elements`);
            }

            if (rows.length === 0) {
                console.log('Available elements on page:');
                console.log('Main containers:', document.querySelectorAll('[role="main"]').length);
                console.log('Rows:', document.querySelectorAll('tr').length);
                console.log('zA elements:', document.querySelectorAll('.zA').length);
                console.log('Current page HTML snippet:', document.body.innerHTML.substring(0, 500));
                
                throw new Error(`No email rows found. Found ${rows.length} rows. Make sure you are on Gmail starred emails page with starred emails present.`);
            }

            // Emit initial progress
            this.emitProgressEvent(0, rows.length, 'Starting email extraction...');

            await this.extractEmails(rows);
            
            return this.getResults();
        }

        /**
         * Extract emails by clicking each row
         */
        async extractEmails(rows) {
            for (const [index, row] of rows.entries()) {
                this.emitProgressEvent(index, rows.length, `Processing email ${index + 1}/${rows.length}...`);
                
                try {
                    console.log(`Processing row ${index + 1}:`, row);
                    
                    // Try to get info from row first (faster method)
                    const rowInfo = Utils.getEmailInfoFromRow(row);
                    console.log('Row info extracted:', rowInfo);
                    
                    // Store initial URL
                    const initialUrl = window.location.href;
                    
                    // Click the row to open the email
                    console.log('Clicking row...');
                    row.click();
                    
                    // Wait for email to load
                    await Utils.sleep(CONFIG.TIMING.CLICK_DELAY);
                    
                    // Capture current URL
                    const currentUrl = window.location.href;
                    this.urls.push(currentUrl);
                    
                    // Try to extract email details from the page (fallback if row extraction failed)
                    let subject = rowInfo.subject || Utils.getEmailSubject();
                    let sender = rowInfo.sender || Utils.getSenderInfo();
                    
                    // If we still don't have good info, try extracting from URL or use defaults
                    if (!subject || subject === 'Email subject not found') {
                        subject = `Email from URL: ${currentUrl.split('/').pop() || 'Unknown'}`;
                    }
                    
                    if (!sender || sender === 'Sender not found') {
                        sender = 'Unknown Sender';
                    }
                    
                    // Add to extracted emails
                    this.extractedEmails.push([subject, currentUrl, sender]);
                    
                    console.log(`Email ${index + 1}: ${subject} - ${currentUrl}`);
                    
                } catch (error) {
                    console.error(`Error processing email ${index + 1}:`, error);
                    // Continue with next email even if one fails
                    this.extractedEmails.push([`Error processing email ${index + 1}: ${error.message}`, window.location.href, 'Unknown']);
                }
                
                // Update progress
                this.emitProgressEvent(index + 1, rows.length, `Extracted ${index + 1}/${rows.length} emails...`);
            }

            // Final processing
            this.emitProgressEvent(rows.length, rows.length, 'Processing results...');
            await Utils.sleep(CONFIG.TIMING.FINAL_WAIT);
        }

        /**
         * Format extracted emails as OTL format
         */
        formatAsOtl() {
            if (this.extractedEmails.length <= 1) {
                return 'Starred Emails\n\nNo starred emails found.';
            }

            let otl = `Starred Emails Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;
            
            // Skip the header row
            for (let i = 1; i < this.extractedEmails.length; i++) {
                const email = this.extractedEmails[i];
                if (email.length >= 2) {
                    const subject = email[0];
                    const url = email[1];
                    const sender = email[2] || '';
                    
                    otl += `\t${subject}\n`;
                    if (sender && sender !== 'Unknown') {
                        otl += `\t\tFrom: ${sender}\n`;
                    }
                    otl += `\t\t${url}\n\n`;
                }
            }

            return otl;
        }

        /**
         * Emit progress event for real-time updates
         */
        emitProgressEvent(current, total, message) {
            const event = new CustomEvent('emailExtractionProgress', {
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
                rawData: this.extractedEmails,
                uniqueData: this.extractedEmails, // No deduplication needed for emails
                formattedOutput: this.formatAsOtl(),
                urls: this.urls
            };
        }
    }

    /**
     * Start the extraction process and return results
     */
    async function runExtraction() {
        try {
            console.log('Starting Gmail extraction...');
            console.log('Page readyState:', document.readyState);
            console.log('Current location:', window.location.href);
            
            // Wait a bit for page to fully load
            if (document.readyState !== 'complete') {
                await Utils.sleep(2000);
            }
            
            const extractor = new GmailStarredExtractor();
            const results = await extractor.init();
            console.log('Extraction completed successfully');
            console.log('All captured URLs:', results.urls);
            return results;
        } catch (error) {
            console.error('Error during email extraction:', error);
            console.error('Error stack:', error.stack);
            
            // Return a basic result even on error so the extension doesn't completely fail
            return {
                rawData: [["STARRED EMAILS", "URL", "SENDER"], [`Error: ${error.message}`, window.location.href, 'System']],
                uniqueData: [["STARRED EMAILS", "URL", "SENDER"], [`Error: ${error.message}`, window.location.href, 'System']],
                formattedOutput: `Gmail Extraction Error\n\nError: ${error.message}\n\nCurrent URL: ${window.location.href}`,
                urls: [window.location.href]
            };
        }
    }

    // Execute and return the result
    return runExtraction();
})();
