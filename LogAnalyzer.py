import os
import sys
import json
from urlparse import urlparse

#hostpath -> [time,]
urlConnTime = {}
#hostpath -> [time,]
urlWaitTime = {}
#hostpath -> [(speed,size,time),]
urlReceiveTime = {}

def ProcessOnePath(urlList, descDict):
	for i in range(len(urlList)):
		url = urlList[i]
		if not url in descDict:
			descDict[url] = []
		for j in range(i):
			ancestorURL = urlList[j]
			if ancestorURL in descDict[url]:
				print "detect loop: ",url,ancestorURL
			if not url in descDict[ancestorURL]:
				descDict[ancestorURL].append(url)

def calcPathTime(path, pathDict):
	count = 0
	for item in path:
		count += item['all']
	rs = "pathLen:%d time:%f"%(len(path),count)
	path.append(rs)
	if not count in pathDict:
		pathDict[count] = []
	
	pathDict[count].append(path)
	

def AnalyzeOneLoadingRequests(contents, pathDict,urlSet):
	orderedURLs = []
	path = []
	for line in contents:
		line = line.strip().lower()
		if len(line) == 0:
			#ProcessOnePath(orderedURLs, descDict)
			#orderedURLs = []
			calcPathTime(path,pathDict)
			path = []
			continue
		if line.startswith('{'):
			try:	
				obj = json.loads(line)
				url = obj['url']
				o = urlparse(url)
				
				if obj['bodysize'] == 0:
					continue
				if obj['all'] == 0:
					continue
				key = o.netloc + o.path
				urlSet.add(key)
				if not key in urlConnTime:
					urlConnTime[key] = []
				if not key in urlWaitTime:
					urlWaitTime[key] = []
				if not key in urlReceiveTime:
					urlReceiveTime[key] = []
				
				path.append(obj)
				#token = o.netloc + o.path+'||size:'+str(obj['bodysize'])
				#token = o.netloc + o.path+'||size:'
				#if o.scheme=='data':
				#	if o.path.startswith('image/'):
				#		token = 'data:image||size:'+str(obj['bodysize'])
						#token = 'data:image||size:'
				#orderedURLs.append(token)
				#orderedURLs.append(url)
			except Exception as e:
				print "Exception ",str(e),line
	#pathDict.keys():
	#descDict[url] = sorted(descDict[url])

def main():
	results = {}
	urlSets = []
	hostPathDict = {}
	for log in sys.argv[1:]:
		hostPathDict[log]=[]
		f = open(log)
		contents = []
		pathDict = {}
		urlSet = set()
		for line in f:
			contents.append(line)
		AnalyzeOneLoadingRequests(contents,pathDict,urlSet)
		results[log] = pathDict
		urlSets.append(urlSet)
		times = sorted(pathDict.keys(),reverse=True)
		for i in range(10):
			for path in pathDict[times[i]]:
				l = len(path)
				print path[l-1]
		#print str(len(descDict))
	curSet = urlSets[0]
	print "SetLen:",str(len(curSet))
	for nextSet in urlSets[1:]:
		print "SetLen:",str(len(nextSet))
		curSet = nextSet & curSet
	finalSet = curSet
	print "FinalSetLen:",str(len(finalSet))
	
	
		
	
	for name in results:
		pathDict = results[name]
		print "File Start"
		times = sorted(pathDict.keys(),reverse=True)
		for i in range(5):
			for path in pathDict[times[i]]:
				#print "PATHTYPE:",str(type(path))
				#print "debug:",str(times[i])	
				#print "length: "+str(len(pathes))
				count = 0
				length = 0
				endTime = 0
				startTime = 0
				hostPathList = []
				for req in path:
					try:
						if startTime == 0:
							startTime = req['starttime']
						#print startTime
						url = req['url']
						o = urlparse(url)
						k = o.netloc + o.path
						if not k in finalSet:
							continue
						#count += req['all']
						#print k
						hostPathList.append(k)
						length += 1
						if req['starttime'] + req['total'] > endTime:
							endTime = req['starttime'] + req['total']
						#print "debug:",str(count)
					except Exception as e:
						pass
						#print "Exception: ",req," ",str(e)
				hostPathDict[name].append(hostPathList)
				print "from %d to %d with length %d inteval:%d"%(times[i],count,length, endTime-startTime)
		print "File End\n"
	
	'''
	#COMMON HOST/PATH
	names = hostPathDict.keys()
	for i in range(len(names)):
		for j in range(i):
			print "FFF: ",str(i),str(j)
			nameA = names[i]
			nameB = names[j]
			
			for ll in hostPathDict[nameA]:
				for rr in hostPathDict[nameB]:
					count = 0
					countA = 0
					for item in ll:
						if item in rr:
							print "  --",str(countA),str(rr.index(item))
							count += 1
						countA += 1
					print "common:",str(count)," ll:",str(len(ll))," rr:",str(len(rr))
	'''				
	
	#for next in results[1:]:
	#	cur = cur & set(next.keys())
		#print str(len(descDict))
		#for key in sorted(descDict):
		#	print key, str(len(descDict[key]))
		#	for url in descDict[key]:
		#		print '  --',url
	#for url in results[0].keys():
	#	if not url in cur:
	#		print url
	#print len(cur)


main()
			