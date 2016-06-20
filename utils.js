'use strict'

let fs = require('fs')
  , path = require('path')
  , config = require('./config.json')
  , csv = require('fast-csv')
  , Bluebird = require('bluebird')
  , winston = require('winston')
  , Datastore = require('nedb')
  , log = winston.info.bind(winston)
  , db = new Datastore(config.datastore)
  , dbLoaded
  , dates
 

fs = Bluebird.promisifyAll(fs)
db = Bluebird.promisifyAll(db)

function getCsvFiles(){
  return fs.readdirAsync(config.csvFolder)
    .then(files => files.filter(file => file.indexOf('.csv')!=-1).map(file => path.join(config.csvFolder, file)))
}

function deleteCsv(file){
  //if(file.indexOf(config.csvFolder)==-1) file = path.join(config.csvFolder, file)
  return fs.unlinkAsync(file)
}

function readCsv(file){
  let stream = fs.createReadStream(file)
    , open, high, low, close
  return new Promise((resolve, reject) => {
    let csvStream = csv()
      .on('data', data => {        
        count++
        if(!count)  {
          open = data.indexOf('OPEN')
          close = data.indexOf('CLOSE')
          high = data.indexOf('HIGH')
          low = data.indexOf('LOW')
          return
        }
        if(count==1)  {
          let date = data[10].split('-')
          obj.date = data[10]          
          // obj.month = date[1]
          // obj.day = date[0]
          // obj.year = date[2]
        }
        obj[`${data[0]}-${data[1]}`] = {
          stock: true,
          open: data[open],
          high: data[high],
          low: data[low],
          close: data[close]
        }
      })
      .on('end', () => resolve(obj))
      , obj = {}
      , count = -1
    stream.pipe(csvStream)
  })
}

function addCsv(file){
  let data
  return readCsv(file)
    .then(_data => {
      data = _data
      return db.findOneAsync({_id: data._id})
    }).then(record => {
      if(record)  return
      return db.insertAsync(data).then(() => deleteCsv(file))
    })
}

function loadCsvs(){
  return getCsvFiles()
    .then(files => Bluebird.mapSeries(files, addCsv))
    .then(() => log('loaded all csv files...'))
}

function sortDates(arry){
  let months = config.months
    , conv  = a => {
      a = a.split('-')
      a[1] = months.indexOf(a[1])
      if(a[1]==-1)  throw new Error('Incorrect Date')
      return (+a[0]) + a[1]*100 + (+a[2])*10000
    }
  return arry.sort((a,b) => conv(a) - conv(b))
}


class Market{
  constructor(){
    dbLoaded = db
      .loadDatabaseAsync()
      .then(() => log('database is loaded...'))
      .then(loadCsvs)
      .then(() => db.findAsync({}, {date:1, _id:0}))
      .then(data => {
        data = data.map(datum => datum.date)
        dates = sortDates(data)
        this.dates = dates
        return db.findOneAsync({})
      })
      .then(data => {
        let keys = []
        for(let key in data)
          if(data[key].stock)
            keys.push(key)
        this.stocks = keys
        log(this.stocks)
      })
  }
}

module.exports = new Market()