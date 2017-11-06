const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');

// create application/json parser
const jsonParser = bodyParser.json();

const dropboxApiUrl = 'https://api.dropboxapi.com/2';
const dropboxContentUrl = 'https://content.dropboxapi.com/2';
const compatibleExtensions = {
  'Image' : ['jpg', 'jpeg', 'png'],
  'Video': ['mp4'],
  'AnimatedGif': ['gif'],
  'Folder': [],
  // GIFs are currently not supported by Dropbox
  // Videos are currently not support by Hootsuite
  '': ['jpg', 'jpeg', 'png']
};

const mimeTypes = {
  'jpeg': 'image/jpeg',
  'jpg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'mp4': 'video/mp4'
};
const mediaTypes = {
  'jpeg': 'Image',
  'jpg': 'Image',
  'png': 'Image',
  'mp4': 'Video',
  'gif': 'AnimatedGif',
};

class Media {
  constructor (height = 0, width = 0, url = '', name = '') {
    this.id = '';
    this.name = name;
    var extension = getExtension(name);
    this.mediaType = mediaTypes[extension];
    this.mimeType = mimeTypes[extension];
    this.original = {
      url: url,
      width: height,
      height: width,
      sizeInBytes: 0
    };
    this.thumbnail = {
      url: url,
      width: width,
      height: height,
    };
  }
}

class Metadata {
  constructor (next = '', previous ='') {
    this.cursor = {
        next: next,
        previous: previous
    };
  }
}

var flatten = arr => {
  return arr.reduce((flat, toFlatten) => {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
};

var getExtension = fileName => {
  var re = /(?:\.([^.]+))?$/;
  return re.exec(fileName)[1];
};

var getDropboxDirectUrl = (fileId, authHeader) => {
  return new Promise((resolve, reject) => {
    var options = {
      url: `${dropboxApiUrl}/files/get_temporary_link`,
      json: true,
      body: {
        path: fileId
      },
      headers: {
        'Authorization': authHeader
      }
    };
    request.post(options, (err, response, body) => {
      resolve({
        id: fileId,
        sharedLink: body.link
      });
    });
  });
};  

var innerDropboxThumbnails = (fileIds, width, height, authHeader, promises) => {
  var currSlice = fileIds.slice(0, 24);
  var nextSlice = fileIds.slice(25);
  var entries = currSlice.map( fileId => {
    return {
      path: fileId,
      format: 'jpeg',
      size: `w${width}h${height}`
    };
  });
  var options = {
    url: `${dropboxContentUrl}/files/get_thumbnail_batch`,
    json: true,
    body: {
      entries: entries
    },
    headers: {
      'Authorization': authHeader
    }
  };
  promises.push(new Promise((resolve, reject) => {
    request.post(options, (err, response, body) => {
      resolve(body.entries.map(entry => {
        return {
          id: entry.metadata.id,
          thumbnail: entry.thumbnail
        };
      }));
    });
  }));

  if (nextSlice.length == 0) {
    return Promise.all(promises).then();
  } else {
    return innerDropboxThumbnails(nextSlice, width, height, authHeader, promises);
  }
};

var flatten = arr => {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
};

var getExtension = fileName => {
  var re = /(?:\.([^.]+))?$/;
  return re.exec(fileName)[1];
};

var getDropboxThumbnails = (fileIds, width, height, authHeader) => {
  return new Promise((resolve, reject) => {
    resolve(innerDropboxThumbnails(fileIds, width, height, authHeader, []).then());
  });
};

var getItemsWithFilter = (folderName = '', authHeader = '', query = '', mediaType = '', cursor) => {
  return new Promise((resolve, reject) => {
    var options = {
      url: `${dropboxApiUrl}/files/list_folder`,
      json: true,
      body: { },
      headers: {
        'Authorization': authHeader
      }
    };
    if (cursor) {
      options.body = {
        cursor: cursor
      };
      options.url += '/continue';
    } else {
      options.body = {
        path: folderName,
        recursive: false,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
      };
      if (query !== '') {
        // search all folders/files if there is a query because you can't currently specify folders
        options.body.recursive = true;
      } else {
        // load a maximum of 20 items at at time
        options.body.limit = 20;
      }
    }
    
    request.post(options, (err, response, body) => {
      var folders = body.entries
      .filter(item => {
        return item['.tag'] === 'folder' && (mediaType === 'Folder' || mediaType === '');
      })
      // filter for query
      .filter(item => {
        return item.name.toLowerCase().includes(query.toLowerCase());
      });
      var compatibleFiles = body.entries
      // filter out files with filesizes larger than 5 MB
      .filter(item => {
        return item.size <= 5 * 1000 * 1000;
      })
      // filter for mediaType
      .filter(item => {
        return compatibleExtensions[mediaType].includes(getExtension(item.name));
      })
      // filter for query
      .filter(item => {
        return item.name.toLowerCase().includes(query.toLowerCase());
      });
      var promises = [];
      compatibleFiles.forEach(file => {
        promises.push(getDropboxDirectUrl(file.id, authHeader));
      });
      promises.push(getDropboxThumbnails(compatibleFiles.map(file => { return file.path_lower; }), 640, 480, authHeader));
      Promise.all(promises).then(data => {
        var flatData = flatten(data);
        var fileData = folders.map(folderData => {
          var folder = new Media();
          folder.id = folderData.id;
          folder.name = folderData.name;
          folder.mediaType = 'Folder';
          folder.mimeType = 'application/vnd.hootsuite.folder';
          return folder;
        });
        fileData.push(...compatibleFiles.map(file => {
          var filteredData = flatData.filter(item => {
            return file.id === item.id;
          });
          const fileData = Object.assign({}, ...filteredData);
          var media = new Media(file.media_info.metadata.dimensions.height, file.media_info.metadata.dimensions.width, fileData.sharedLink, file.name);
          media.id = file.id;
          media.original.sizeInBytes = file.size;
          media.thumbnail.url = 'data:image/jpeg;base64, ' + fileData.thumbnail;
          return media;
        }));
        // body.cursor is the next cursor, cursor is the current cursor
        var metadata = new Metadata(body.cursor, cursor);
        // don't set another cursor if it points to nothing
        if (fileData.length === 0 || body.has_more === false) {
          metadata.cursor.next = '';
        }
        resolve({
          fileData: fileData,
          metadata: metadata
        });
      });
    });
  });
};

app.use((req, res, next) => {
  console.log(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
  return next();
});

app.use(express.static('static'));
app.use(jsonParser);

app.get('/v1/status', (req, res) => {
  res.status(200).end();
});

app.post('/webhooks', (req, res) => {
  console.log("Webhook content:\n\n%s", JSON.stringify(req.body));
  res.status(200).end();
});

app.get('/v1/media', (req, res) => {
  var dropboxAuthHeader = req.headers.authorization;
  try {
    // Once OAuth 2 w/ Dropbox redirect is fixed uncomment this if statement
    // if (!dropboxAuthHeader) {
    dropboxAuthHeader = 'Bearer ' + process.env.DROPBOX_ACCESS_TOKEN;
    // }
  } catch (err) {
    console.log(err);
  }
  if (dropboxAuthHeader) {
    try {
      getItemsWithFilter(req.query.parentId, dropboxAuthHeader, req.query.query, req.query.mediaType, req.query.cursor).then(data => {
        res.json({
          data: data.fileData,
          metadata: data.metadata
        });
      });
    } catch (err) {
      res.status(500).send({error: 'error occurred while fetching items'});
    }
  } else {
    res.status(500).send({error: 'dropbox auth header not found'});
  }
});

// All Hoosuite apps require HTTPS, so in order to host locally
// you must have some certs. They don't need to be issued by a CA for development,
// but for production they definitely do! Heroku adds its own TLS,
// so you don't have to worry about it as long as TLS is enabled on your Heroku app.
if (fs.existsSync('certs/server.crt') && fs.existsSync('certs/server.key')) {
  const certificate = fs.readFileSync('certs/server.crt').toString();
  const privateKey = fs.readFileSync('certs/server.key').toString();
  const options = {key: privateKey, cert: certificate};

  var server = https.createServer(options, app).listen(process.env.PORT || 5000);
  console.log(`Example app listening on port ${process.env.PORT || 5000} using HTTPS`);
} else {
  var server = http.createServer(app).listen(process.env.PORT || 5000);
  console.log(`Example app listening on port ${process.env.PORT || 5000}`);
}
