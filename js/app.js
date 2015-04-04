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
var outputData = [];

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
    var blob = new Blob([textarea.value], {type: 'text/plain'});
    //var blob = new Blob([launchData.resultArr], {type: 'text/plain'});
    writeFileEntry(writableEntry, blob, function(e) {
      output.textContent = 'Textarea write complete :)';
    });
  });
});

writeFileButton.addEventListener('click', function(e) {
  var accepts = [{
    extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']
  }];
  chrome.fileSystem.chooseEntry({type: 'saveFile', accepts: accepts}, function(entry) {
    if (!entry) {
      output.textContent = 'No file selected.';
      return;
    }
    chrome.storage.local.set(
        {'chosenSavingFile': chrome.fileSystem.retainEntry(entry)});
  });
});

saveFileButton.addEventListener('click', function(e) {
  chrome.storage.local.get('chosenSavingFile', function(items) {
    if (items.chosenSavingFile) {
      chrome.fileSystem.restoreEntry(items.chosenSavingFile, function(chosenEntry) {
        if (chosenEntry) {
          console.log("file ID: "+items.chosenSavingFile);
          displayPath(chosenEntry);
          var blob = new Blob(outputData, {type: 'text/plain'});
          writeFileEntry(chosenEntry, blob, function(e) {
            output.textContent = reqData.firstURL+' write complete :)';
          });
        }
        else{
          output.textContent = "failed to restore entry"
        }
      }); 
    }
    else{
      output.textContent = "No chosenFile saved";
      var accepts = [{extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']}];
      chrome.fileSystem.chooseEntry({type: 'saveFile', accepts: accepts}, function(entry) {
        if (!entry) {
          output.textContent = 'No file selected.';
          return;
        }
        chrome.storage.local.set({'chosenSavingFile': chrome.fileSystem.retainEntry(entry)});
        chrome.storage.local.get('chosenSavingFile', function(items){
        output.textContent = "DEBUG:"+items.chosenSavingFile});
        var blob = new Blob(outputData, {type: 'text/plain'});
        writeFileEntry(entry, blob, function(e) {
          output.textContent = reqData.firstURL+' write complete :)';
        });
      });
    }//else
  });
});
function getURLHost(url){
  var a = document.createElement('a');
  a.href = url;
  return a.host;
}
function getURLHostAndPath(url){
  var a = document.createElement('a');
  a.href = url;
  return a.host+a.pathname;
}
function clone(obj) {
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
            temp[key] = clone(obj[key]);
        }
    }
    return temp;
}

function GraphVisitor(arr, index){
    this.arr = arr;
    this.firstIndex = index;
    this.DFVisitorList = {};
    this.largestEstimatedVal = 0;
    this.largestRealVal = 0;
    this.outputData = [];
    this.longestList = "";
    this.connTime = {};
    this.waitTime = {};
    this.deltaTime = [];
}

GraphVisitor.prototype.DFVisitor = function(index, output,preDegree,totalValue,estimatedValue,hostDict,hostList){
    /*Number*/
    var degree = this.arr[index].degree;
    if(preDegree >= degree){
        console.log("ERROR find a LOOP "+output);
        return ;
    }
    var throuput = this.arr[index].respBodySize <= 0 ?
                    0 : this.arr[index].respBodySize/this.arr[index].receiveTime;
    var debugDelta = 0;
    var allTime = this.arr[index].delta + this.arr[index].totalTime;
    totalValue += allTime;
  
    /*String*/
    var urlStr = '"url":"'+this.arr[index].url.url+'"';
    var shortURL = getURLHostAndPath(this.arr[index].url.url);
    var deltaStr = '"delta":'+this.arr[index].delta;
    var waitTimeStr = '"wait":'+this.arr[index].waitTime;
    var receiveTimeStr = '"receive":'+this.arr[index].receiveTime;
    var totalTimeStr =  '"total":'+this.arr[index].totalTime;
    var connTimeStr = '"conn":'+this.arr[index].connectTime;
    var blockTimeStr = '"blocked":'+this.arr[index].blockedTime;
    var respBodySizeStr = '"bodySize":'+this.arr[index].respBodySize;
    var allTimeStr = '"all":'+allTime;
    var startTimeStr = '"startTime":'+this.arr[index].startTime;
    var degreeStr = '"degree":'+degree;
    var throuputStr = '"throuput":'+throuput;
    var debugDeltaStr = "";
    var curOut = "";

    /*Others*/
    var nextList = this.arr[index].nextList;
    
    /*Update host-path info*/
    if(shortURL in hostDict){
      hostDict[shortURL] = hostDict[shortURL] + 1;
    }
    else{
      hostDict[shortURL] = 1;
    }
    hostList.push(shortURL);

    /*Update timing info*/
    var host = getURLHost(this.arr[index].url.url);
    if(this.arr[index].connectTime != -1){
      if(host in this.connTime)
        this.connTime[host].push(this.arr[index].connectTime);
      else
        this.connTime[host] = [this.arr[index].connectTime];
    }
    if(this.arr[index].waitTime != -1){
      if(host in this.waitTime)
        this.waitTime[host].push(this.arr[index].waitTime);
      else
        this.waitTime[host] = [this.arr[index].waitTime];
    }

    /*Estimate*/
    if(this.arr[index].waitTime < 1000){
        estimatedValue += this.arr[index].waitTime * 3;  
        debugDelta = allTime - this.arr[index].waitTime * 3; 
    }   
    else{
        estimatedValue += this.arr[index].waitTime;
        debugDelta = allTime - this.arr[index].waitTime ;
    }
    debugDeltaStr = '"debugDelta":'+debugDelta;
    
    curOut = "{"+urlStr;
    curOut += ", "+degreeStr+", "+deltaStr+", "+connTimeStr;
    curOut += ", "+waitTimeStr +", "+receiveTimeStr+", "+respBodySizeStr;
    curOut += ", "+totalTimeStr+", "+allTimeStr+", "+throuputStr+", "+startTimeStr+
              ", "+blockTimeStr+", "+debugDeltaStr+"} \n";
    output += curOut;
    
    /*Found a path*/
    if(nextList.length == 0){   
      /*Hosts on a path*/ 
      var keys = Object.keys(hostDict);
      keys.sort();
      var hostDictStr = "HostDict:\n"; 
      var count = 0;
      for(var index in keys){
        count += 1;
        //hostDictStr += ("HostDictItem: "+count+" HOST: "+keys[index]+" NUM:"+hostDict[keys[index]]+"\n");
      }
      //this.outputData.push(hostDictStr);
      count = 0;
      var hostListStr = "HostList:\n";
      for(var index in hostList){
        count += 1;
        //hostListStr += ("HostListItem: "+count+" HOST: "+hostList[index]+"\n");
      }
      //this.outputData.push(hostListStr);

      /*Timings of each request*/ 
      this.outputData.push("RT:"+totalValue+" ET:"+estimatedValue+"\n"+output+"\n");
      if(totalValue>this.largestRealVal){
        this.largestRealVal = totalValue;
        this.longestList = hostDictStr+hostListStr+output;
      }
          
      if(estimatedValue>this.largestEstimatedVal)
          this.largestEstimatedVal = estimatedValue;
      return;
    }

    for(var i in nextList){
        var nextIndex = nextList[i];
        if(nextIndex==index)
            continue;
        if(nextIndex in this.DFVisitorList){
            console.log("ERROR LOOP: "+index+" TO "+nextIndex);
            continue;
        }
        else{
            this.DFVisitorList[nextIndex] = degree + 1;
        }
        //bg.console.log("DF:"+nextList+"  "+index+" => "+i);
        this.DFVisitor(nextIndex,output,degree,totalValue,estimatedValue,
                        clone(hostDict),clone(hostList));
    }
}


var onLoadHandler = function(event){
  if(typeof reqData == 'undefined'){
    output.textContent = "No requests data";
  }
  else{
    var url = reqData.firstURL;
    var loadingTime = "RealLoadingTime:"+reqData.loadingTime;
    var requests = JSON.parse(reqData.resultArr);
    var firstIndex = -1;
    for(var i in requests){
      if(requests[i].url.url == url){
        firstIndex = i;
        break;
      }
      else{
        console.log(url+" "+requests[i].url.url);
      }
    }
    
    var visitor = new GraphVisitor(requests, firstIndex);
    visitor.DFVisitorList = {};
    visitor.DFVisitor(firstIndex,"",-1,0,0,{},[]);
    var connDict = visitor.connTime;
    for(var host in connDict){
      connDict[host].sort();
    }
    var connStr = "Connection Times:\n";
    var keys = Object.keys(connDict);
    keys = keys.sort();
    for(var i in keys){
      var key = keys[i];
      connStr += key+" : ";
      for(var j in connDict[key])
        connStr+= connDict[key][j]+", ";
      connStr += "\n";
    }
    connStr += "\n";
    var waitDict = visitor.waitTime ;
    for(var host in waitDict){
      waitDict[host].sort();
    }
    var waitStr = "Wait Times:\n";
    var keys = Object.keys(waitDict);
    keys = keys.sort();
    for(var i in keys){
      var key = keys[i];
      waitStr += key+" : ";
      for(var j in waitDict[key])
        waitStr+= waitDict[key][j]+", ";
      waitStr += "\n";
    }
    waitStr += "\n";

    var largestCalculatedVal = "LargestCalculatedVal:"+visitor.largestRealVal; 
    var largestEstimatedVal = "LargestEstimatedVal:"+visitor.largestEstimatedVal; 
    var longestList = "LongestList:"+visitor.longestList;
    outputData = [url+" "];
    outputData.push(connStr);
    outputData.push(waitStr);
    outputData.push(loadingTime+" ");
    outputData.push(largestCalculatedVal+" ");
    outputData.push(largestEstimatedVal);
    outputData.push("\n\n");
    outputData.push(longestList);
    outputData.push("\n\n");
    outputData = outputData.concat(visitor.outputData);
    console.log(firstIndex+"  "+requests.length+" pathNumber:"+outputData.length);
    saveFileButton.click();
  }
}

window.addEventListener("load",onLoadHandler);
