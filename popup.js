import { getActiveTabURL } from "./utils.js";

// Format time in seconds to HH:MM:SS or MM:SS format
const formatTime = (timeInSeconds) => {
  const date = new Date(0);
  date.setSeconds(timeInSeconds);
  const timeString = date.toISOString().substring(11, 19);
  // Remove leading zeros and hours if it's 00
  return timeString.startsWith("00:") ? timeString.substring(3) : timeString;
};

const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");

  // Format the timestamp and add it to the description
  const formattedTime = formatTime(bookmark.time);
  bookmarkTitleElement.textContent = `${formattedTime} - ${bookmark.desc}`;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("link", onCopyLink, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      // Update the bookmark description to use sequential numbering
      bookmark.desc = `Bookmark ${i + 1}`;
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<div class="no-bookmarks">No bookmarks to show</div>';
  }

  return;
};

const onPlay = async (e) => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

const onDelete = async (e) => {
  const activeTab = await getActiveTabURL();
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const bookmarkElementToDelete = document.getElementById(
    "bookmark-" + bookmarkTime
  );

  bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "DELETE",
      value: bookmarkTime,
    },
    viewBookmarks
  );
};

const onCopyLink = async (e) => {
  const activeTab = await getActiveTabURL();
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  
  // Create a YouTube timestamp URL
  const videoId = new URLSearchParams(activeTab.url.split("?")[1]).get("v");
  const timestampSeconds = Math.floor(parseFloat(bookmarkTime));
  const timestampUrl = `https://www.youtube.com/watch?v=${videoId}&t=${timestampSeconds}s`;
  
  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(timestampUrl);
    // Visual feedback that the link was copied
    const bookmarkElement = document.getElementById("bookmark-" + bookmarkTime);
    bookmarkElement.style.backgroundColor = "#3a3a3c";
    setTimeout(() => {
      bookmarkElement.style.backgroundColor = "";
    }, 300);
  } catch (err) {
    console.error("Failed to copy link: ", err);
  }
};

// Set attributes for bookmark controls (play, link, and delete) 
const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo]
        ? JSON.parse(data[currentVideo])
        : [];

      viewBookmarks(currentVideoBookmarks);
    });
  }
  else if(activeTab.url.includes("youtube.com")){
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML =
      '<div class="title">VideoMark</div><div class="response" style="text-align: center;">This is the Youtube Home Page.</div>';
  }
  else {
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML =
      '<div class="title">VideoMark</div><div class="response" style="text-align: center;">This is not a Youtube Video Page.</div>';
  }
});
