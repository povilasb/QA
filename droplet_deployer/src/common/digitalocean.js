// TODO try to replace with digitalocean.node package from npm

var Api = function(token, testMode) {
  var request = require('request-json');

  var client = request.createClient('https://api.digitalocean.com/');
  client.headers.Authorization = 'Bearer ' + token;
  var filterRegions = function(regionsList) {
    var regions = [];
    var filter = [];
    var location;
    for (var j in regionsList) {
      if (regionsList[j]) {
        location = regionsList[j].substring(0, 3);
        if (filter.indexOf(location) !== -1) {
          continue;
        }
        filter.push(location);
        regions.push(regionsList[j]);
      }
    }
    return regions;
  };

  this.getAvailableRegions = function(size, callback) {
    client.get('v2/sizes', function(err, response, body) {
      if (err || response.statusCode !== 200) {
        callback('Failed to fetch regions list');
        return;
      }
      for (var i in body.sizes) {
        if (body.sizes[i]) {
          if (body.sizes[i].slug !== size) {
            continue;
          }
          callback(null, filterRegions(body.sizes[i].regions));
          break;
        }
      }
    });
  };

  this.createDroplet = function(name, region, size, image, sshKeys, callback) {
    var payload = {
      'name': name,
      'region': region,
      'size': size,
      'image': image,
      'ssh_keys': sshKeys,
      'backups': false,
      'ipv6': true,
      'user_data': null,
      'monitoring': true,
      'private_networking': null
    };
    if (testMode) {
      callback(null, 101);
      return;
    }
    client.post('v2/droplets', payload, function(err, response, body) {
      if (err || response.statusCode !== 202) {
        callback('Failed to create droplet with status code :: ' + response.statusCode);
      } else {
        callback(null, body.droplet.id);
      }
    });
  };

  this.getDroplet = function(id, callback) {
    if (testMode) {
      callback(null, require('../../template/droplet_response.json'));
      return;
    }
    client.get('v2/droplets/' + id, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        callback('Failed to fetch Droplet');
        return;
      }
      callback(null, body.droplet);
    });
  };

  this.getDropletList = function(callback) {
    var dropletList = [];
    var PAGE_SIZE = 200;
    var pageNumber = 1;
    var getDroplets = function() {
      client.get('v2/droplets?page=' + pageNumber + '&per_page=' + PAGE_SIZE, function(err, response, body) {
        if (err || response.statusCode !== 200) {
          callback('Failed to fetch Droplets list');
          return;
        }
        dropletList = dropletList.concat(body.droplets);
        if (body.droplets.length === PAGE_SIZE) {
          pageNumber += 1;
          getDroplets();
        } else {
          callback(null, dropletList);
        }
      });
    };
    getDroplets();
  };

  this.deleteDroplet = function(id, callback) {
    if (testMode) {
      callback(null);
      return;
    }
    client.del('v2/droplets/' + id, function(err, response) {
      if (err || response.statusCode !== 204) {
        callback(id);
        return;
      }
      callback(null);
    });
  };

  this.getImage = function(id, callback) {
    client.get('v2/images/' + id, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        callback(err || 'Failed with code ' + response.statusCode);
        return;
      }
      callback(null, body);
    });
  };

  return this;
};

exports.Api = Api;
