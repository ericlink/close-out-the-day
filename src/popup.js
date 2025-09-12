// Popup script for Close Out The Day extension

class PopupController {
    constructor() {
        this.extractBtn = document.getElementById('extractBtn');
        this.extractOtlBtn = document.getElementById('extractOtlBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.output = document.getElementById('output');
        this.status = document.getElementById('status');
        this.statusText = document.querySelector('.status-text');
        this.statusIcon = document.querySelector('.status-icon');
        this.itemCount = document.getElementById('itemCount');
        this.outputTitle = document.getElementById('outputTitle');
        this.dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
        
        this.currentFormat = 'markdown'; // Track current output format
        this.currentDataSource = 'slack'; // Track current data source
        
        this.initEventListeners();
        this.checkActiveTab();
    }

    initEventListeners() {
        this.extractBtn.addEventListener('click', () => this.extractSavedItems('markdown'));
        this.extractOtlBtn.addEventListener('click', () => this.extractSavedItems('otl'));
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // Listen for data source changes
        this.dataSourceRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentDataSource = e.target.value;
                this.checkActiveTab();
            });
        });
    }

    async checkActiveTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (this.currentDataSource === 'slack') {
                if (!tab.url.includes('app.slack.com')) {
                    // naviagate here https://app.slack.com/client/T053ZFRG5/later
                    chrome.tabs.update({ url: 'https://app.slack.com/client/T053ZFRG5/later' });
                } else {
                    this.updateStatus('ℹ️', 'Choose an extraction format to begin', 'info');
                    this.extractBtn.disabled = false;
                    this.extractOtlBtn.disabled = false;
                }
            } else if (this.currentDataSource === 'email') {
                // For email extraction, check for Gmail or other email providers
                if (!tab.url.includes('mail.google.com') && !tab.url.includes('outlook.com')) {
                    // naviagate here https://mail.google.com/mail/u/0/#starred
                    chrome.tabs.update({ url: 'https://mail.google.com/mail/u/0/#starred' });
                } else {
                    this.updateStatus('⚠️', 'Email extraction not yet implemented', 'error');
                    this.extractBtn.disabled = true;
                    this.extractOtlBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Error checking tab:', error);
        }
    }

    updateStatus(icon, text, type = 'info') {
        this.statusIcon.textContent = icon;
        this.statusText.textContent = text;
        this.status.className = `status ${type}`;
    }

    async extractSavedItems(format = 'markdown') {
        try {
            this.extractBtn.disabled = true;
            this.extractOtlBtn.disabled = true;
            this.currentFormat = format;
            
            const formatName = format === 'otl' ? 'OTL' : 'Markdown';
            const dataSourceName = this.currentDataSource === 'slack' ? 'Slack saved items' : 'starred emails';
            this.updateStatus('⏳', `Extracting ${dataSourceName} to ${formatName}...`, 'loading');
            this.itemCount.textContent = '0 items';

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (this.currentDataSource === 'slack') {
                // Set up progress listener before injection
                await this.setupProgressListener(tab.id);
                
                // Inject and run the extractor script
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/slack-extractor-injected.js']
                });
                
                await this.handleExtractionResults(results, format, formatName);
            } else if (this.currentDataSource === 'email') {
                throw new Error('Email extraction not yet implemented');
            }
        } catch (error) {
            console.error('Extraction error:', error);
            this.updateStatus('❌', 'Failed to extract saved items. Please try again.', 'error');
        } finally {
            this.extractBtn.disabled = false;
            this.extractOtlBtn.disabled = false;
        }
    }

    async handleExtractionResults(results, format, formatName) {
        if (results && results[0] && results[0].result) {
            const extractionResults = results[0].result;
            const bookmarks = extractionResults.uniqueData || extractionResults; // Handle both new and old format
            let output;
            
            if (format === 'otl') {
                // Use the pre-formatted output if available, otherwise convert
                output = extractionResults.formattedOutput || this.convertToOtl(bookmarks);
                this.outputTitle.textContent = 'OTL Output';
            } else {
                output = this.convertToMarkdown(bookmarks);
                this.outputTitle.textContent = 'Markdown Output';
            }
            
            this.displayResults(output, bookmarks.length - 1); // -1 for header row
            this.updateStatus('✅', `Extraction completed successfully in ${formatName} format!`, 'success');
        } else {
            throw new Error('No results returned from extractor');
        }
    }

    convertToOtl(bookmarks) {
        if (!bookmarks || bookmarks.length <= 1) {
            return 'Saved Items\n\nNo saved items found.';
        }
        
        let otl = `Saved Items Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;
        
        // Skip the header row
        for (let i = 1; i < bookmarks.length; i++) {
            const bookmark = bookmarks[i];
            if (bookmark.length >= 2) {
                let message = bookmark[0];
                const link = bookmark[1];

                message = message.replaceAll('Saved for later ', '');
                
                otl += `\t${message}\n`;
                otl += `\t\t${link}\n\n`;
             }
        }

        return otl;
    }

    convertToMarkdown(bookmarks) {
        if (!bookmarks || bookmarks.length <= 1) {
            return '# Saved Items\n\nNo saved items found.';
        }

        let markdown = '# 📋 Saved Items Export\n\n';
        markdown += `*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n\n`;
        
        // Skip the header row
        for (let i = 1; i < bookmarks.length; i++) {
            const bookmark = bookmarks[i];
            if (bookmark.length >= 2) {
                const message = bookmark[0];
                const link = bookmark[1];
                
                markdown += `## Item ${i}\n\n`;
                markdown += `**Message:** ${message}\n\n`;
                markdown += `**Link:** [View in Slack](${link})\n\n`;
                markdown += '---\n\n';
            }
        }
        
        return markdown;
    }

    displayResults(markdown, itemCount) {
        this.output.value = markdown;
        this.itemCount.textContent = `${itemCount} items`;
        this.copyBtn.disabled = false;
    }

    async setupProgressListener(tabId) {
        // Inject a progress listener into the tab
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // Set up event listener for progress updates
                document.addEventListener('slackExtractionProgress', (event) => {
                    // Send progress to extension
                    chrome.runtime.sendMessage({
                        type: 'extractionProgress',
                        data: event.detail
                    });
                });
            }
        });

        // Listen for progress messages from the content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'extractionProgress') {
                this.updateProgress(message.data);
            }
        });
    }

    updateProgress(progressData) {
        const { current, total, message, percentage } = progressData;
        
        // Update status with progress message
        this.updateStatus('⏳', message, 'loading');
        
        // Update item count with current progress
        this.itemCount.textContent = `${current}/${total} (${percentage}%)`;
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.output.value);
            this.updateStatus('📋', 'Markdown copied to clipboard!', 'success');
            
            // Reset status after 2 seconds
            setTimeout(() => {
                this.updateStatus('ℹ️', 'Ready to extract more items', 'info');
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            this.updateStatus('❌', 'Failed to copy to clipboard', 'error');
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
