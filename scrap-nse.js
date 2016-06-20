'use strict'

let browser = require('webdriverio').remote({ desiredCapabilities: { browserName: 'chrome' } })
browser.init()
   

let months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL']
  , days = []
  , count=0

for(let i=1;i<32;i++) days.push(i>9? i: '0'+i)

for(let mon of months)
  for(let day of days)
    setTimeout(() => 
      browser.url(`http://www.nseindia.com/content/historical/EQUITIES/2016/${mon}/cm${day}${mon}2016bhav.csv.zip`)
    , (++count)*2000 )
