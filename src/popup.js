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
        
        this.currentFormat = 'markdown'; // Track current output format
        
        this.initEventListeners();
        this.checkSlackTab();
    }

    initEventListeners() {
        this.extractBtn.addEventListener('click', () => this.extractSavedItems('markdown'));
        this.extractOtlBtn.addEventListener('click', () => this.extractSavedItems('otl'));
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    async checkSlackTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes('app.slack.com')) {
                this.updateStatus('⚠️', 'Please navigate to Slack to extract saved items', 'error');
                this.extractBtn.disabled = true;
                this.extractOtlBtn.disabled = true;
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
            this.updateStatus('⏳', `Extracting saved items to ${formatName}...`, 'loading');

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject and run the extractor script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/slack-extractor-injected.js']
            });

            if (results && results[0] && results[0].result) {
                const bookmarks = results[0].result;
                let output;
                
                if (format === 'otl') {
                    output = this.convertToOtl(bookmarks);
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
        } catch (error) {
            console.error('Extraction error:', error);
            this.updateStatus('❌', 'Failed to extract saved items. Please try again.', 'error');
        } finally {
            this.extractBtn.disabled = false;
            this.extractOtlBtn.disabled = false;
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
