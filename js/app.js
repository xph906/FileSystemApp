/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
*/

function errorHandler(e) {
  console.error(e);
}

function displayPath(fileEntry) {
  chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
    document.querySelector('#file_path').value = path;
    //console.log("filePath:"+path);
  });
}

function readAsText(fileEntry, callback) {
  fileEntry.file(function(file) {
    var reader = new FileReader();

    reader.onerror = errorHandler;
    reader.onload = function(e) {
      callback(e.target.result);
    };

    reader.readAsText(file);
  });
}

function writeFileEntry(writableEntry, opt_blob, callback) {
  if (!writableEntry) {
    output.textContent = 'Nothing selected.';
    return;
  }

  writableEntry.createWriter(function(writer) {

    writer.onerror = errorHandler;
    writer.onwriteend = callback;

    // If we have data, write it to the file. Otherwise, just use the file we
    // loaded.
    if (opt_blob) {
      writer.truncate(opt_blob.size);
      waitForIO(writer, function() {
        writer.seek(0);
        writer.write(opt_blob);
      });
    } else {
      chosenFileEntry.file(function(file) {
        writer.truncate(file.fileSize);
        waitForIO(writer, function() {
          writer.seek(0);
          writer.write(file);
        });
      });
    }
  }, errorHandler);
}

function waitForIO(writer, callback) {
  // set a watchdog to avoid eventual locking:
  var start = Date.now();
  // wait for a few seconds
  var reentrant = function() {
    if (writer.readyState===writer.WRITING && Date.now()-start<4000) {
      setTimeout(reentrant, 100);
      return;
    }
    if (writer.readyState===writer.WRITING) {
      console.error("Write operation taking too long, aborting!"+
        " (current writer readyState is "+writer.readyState+")");
      writer.abort();
    } else {
      callback();
    }
  };
  setTimeout(reentrant, 100);
}

var chosenFileEntry = null;
var writeFileButton = document.querySelector('#write_file');
var chooseFileButton = document.querySelector('#choose_file');
var saveAsFileButton = document.querySelector('#save_as_file');
var saveFileButton = document.querySelector('#save_file');
var output = document.querySelector('output');
var textarea = document.querySelector('textarea');

//_chosenFileEntry is HTML5 FileEntry
function loadFileEntry(_chosenFileEntry) {
  chosenFileEntry = _chosenFileEntry;
  chosenFileEntry.file(function(file) {
    readAsText(chosenFileEntry, function(result) {
      textarea.value = result;
    });
    // Update display.
    writeFileButton.disabled = false;
    saveAsFileButton.disabled = false;
    saveFileButton.disabled = false;
    displayPath(chosenFileEntry);
  });
}
function loadInitialFile() {
  chrome.storage.local.get('chosenFile', function(items) {
    if (items.chosenFile) {
      //chrome.fileSystem.restoreEntry(string id, function callback)
      chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) {
        if (chosenEntry) {
          loadFileEntry(chosenEntry);
        }
      });
    }
  });
}

chooseFileButton.addEventListener('click', function(e) {
  // "type/*" mimetypes aren't respected. Explicitly use extensions for now.
  // See crbug.com/145112.
  var accepts = [{
    //mimeTypes: ['text/*'],
    extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']
  }];
  chrome.fileSystem.chooseEntry({type: 'openWritableFile', accepts: accepts}, function(readOnlyEntry) {
    if (!readOnlyEntry) {
      output.textContent = 'No file selected.';
      return;
    }
    //retainEntry returns an id that can be passed to restoreEntry to regain access to a given file entry
    //Therefore, the storage stores the id of each file: chosenFile:fileID
    chrome.storage.local.set(
        {'chosenFile': chrome.fileSystem.retainEntry(readOnlyEntry)});
    loadFileEntry(readOnlyEntry);
  });
});

saveAsFileButton.addEventListener('click', function(e) {
  var config = {type: 'saveFile', suggestedName: chosenFileEntry.name};
  chrome.fileSystem.chooseEntry(config, function(writableEntry) {
    //var blob = new Blob([textarea.value], {type: 'text/plain'});
    var blob = new Blob([launchData.resultArr], {type: 'text/plain'});
    writeFileEntry(writableEntry, blob, function(e) {
      output.textContent = 'Write complete :)';
    });
  });
});

saveFileButton.addEventListener('click', function(e) {
  chrome.storage.local.get('chosenFile', function(items) {
    if (items.chosenFile) {
      //chrome.fileSystem.restoreEntry(string id, function callback)
      chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) {
        if (chosenEntry) {
          var blob = new Blob([launchData.resultArr], {type: 'text/plain'});
          writeFileEntry(chosenEntry, blob, function(e) {
            output.textContent = 'Write complete :)';
          });
        }
      });
    }
    else{
      output.textContent = "No chosenFile";
      chooseFileButton.click();
    }
  });
});

// Support dropping a single file onto this app.
var dnd = new DnDFileController('body', function(data) {
  chosenFileEntry = null;
  for (var i = 0; i < data.items.length; i++) {
    var item = data.items[i];
    if (item.kind == 'file' &&
        item.type.match('text/*') &&
        item.webkitGetAsEntry()) {
      chosenFileEntry = item.webkitGetAsEntry();
      break;
    }
  };

  if (!chosenFileEntry) {
    output.textContent = "Sorry. That's not a text file.";
    return;
  } else {
        output.textContent = "";
  }

  readAsText(chosenFileEntry, function(result) {
    textarea.value = result;
  });
  // Update display.
  writeFileButton.disabled = false;
  saveAsFileButton.disabled = false;
  displayPath(chosenFileEntry);
});

loadInitialFile();
window.addEventListener("load",function(evt) {saveFileButton.click();});