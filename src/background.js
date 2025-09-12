// Background script
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`windowId: ${activeInfo.windowId} tabId:${activeInfo.tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`message: ${message} sender: ${sender} sendResponse: ${sendResponse}`);
});

console.log(`close out the day: loaded.`)
