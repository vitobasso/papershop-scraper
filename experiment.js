var webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();


var actions =[
    {type: "url", value: "http://www.ebay.com/"},
    {type: "click", target: "//*[@id='gh-ac']"},
    {type: "text", target: "//*[@id='gh-ac']", value: "Android"},
    {type: "click", target: "//*[@id='gh-btn']"}
]

var container = "/html/body/div[5]/div[2]/div[1]/div[1]/div/div[1]/div/div[3]/div/div[1]/div/w-root/div/div/ul"
var item = (i) => "/li[" + i + "]"
var title = "/h3/a"
var price = "/ul/li/span"
var from = "/ul[2]/li"
var type = "/ul/li[2]/span"
var photo = "/div/div/a/img"
var itemField = (i, field) => container + item(1) + field

driver.get('http://www.ebay.com');
driver.findElement(By.xpath("//*[@id='gh-ac']")).sendKeys('Android');
driver.findElement(By.xpath("//*[@id='gh-btn']")).click();
driver.wait(until.elementLocated(By.xpath(container)), 5000);

var textVal = driver.findElement(By.xpath(itemField(1, title))).getText()
var priceVal = driver.findElement(By.xpath(itemField(1, price))).getText()
var fromVal = driver.findElement(By.xpath(itemField(1, from))).getText()
var typeVal = driver.findElement(By.xpath(itemField(1, type))).getText()
var photoVal = driver.findElement(By.xpath(itemField(1, photo))).getAttribute("src")
Promise.all([textVal, priceVal, fromVal, typeVal, photoVal]).then(
    (values) => console.log(values)
)


//driver.quit();