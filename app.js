//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );

//creating a new express server
var app = express();

//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
app.use( '/assets', express.static( 'assets' ) );


//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
app.get( '/', function ( req, res ) {
    res.render( 'home', {
		error: "",
    });
});

app.get( '/process', function ( req, res ) {
	const url = req.query.lbcUrl;
	if (url) {
		getLBCData(url, res, getMAEstimation)
	}
	else {
		res.render( 'home', {
			error: 'Url is empty'
		});
	} 
});


function getLBCData( lbcUrl, routeResponse, callback){
	request( lbcUrl, function (error,response, html){
		if (!error) {
			let $ = cheerio.load(html);//Module pour parser le Document html
			const lbcData = parseLBCData (html)
			if (lbcData){
				console.log('LBC_Data:',lbcData)//affiche dans la console
				callback(lbcData, routeResponse)
			}
			else{
				routeResponse.render('home', {
					error: 'No data found'
				});	
			}
		}
		else{
			routeResponse.render('home', {
				error:'Error loading the given URL'
			});	
		}
	});
}

function parseLBCData (html) {
	
	const $ = cheerio.load(html);
	const lbcDataArray = $('section.properties span.value')
	//toutes les valeurs des noeuds "span" fils de secion.properties
	//stocke dans un tableau
	//récupérer les données à partir du tableau
	return lbcData = {
		price: parseInt($(lbcDataArray.get(0)).text().replace(/\s/g,''),10),
		city: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\s/g,'-').replace(/\-\d+/,''),
		postalCode: $(lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\D|\-/g,''),
		type: $(lbcDataArray.get(2)).text().trim().toLowerCase(),
		surface: parseInt($(lbcDataArray.get(5)).text().replace(/\s/g,''),10)
	}
}


function getMAEstimation (lbcData, routeResponse ) {
	if (lbcData.city && lbcData.surface &&  lbcData.price){
		//instancie les paramètres avec les valeurs de lbcData pour city et postaleCode
		const url = 'https://www.meilleursagents.com/prix-immobilier/{city}-{postalCode}/'.replace('{city}',lbcData.city.replace(/\_/g,'-')).replace('{postalCode}',lbcData.postalCode);
		
		console.log('MA_URL:', url)
	
		request(url, function(error, response, html) {
			if (!error){
				let $ = cheerio.load(html);
				//console.log($( 'meta[name=description]').get());
				//console.log($( 'meta[name=description]').get()[0].attribs);
				//console.log($( 'meta[name=description]').get()[0].attribs.content );
				if($( 'meta[name=description]').get().length===1 && $( 'meta[name=description]').get()[0].attribs && $( 'meta[name=description]').get()[0].attribs.content ) {
					const maData = parseMAData ($( 'meta[name=description]').get()[0].attribs.content)
					if (maData){
						console.log('MA_Data:',maData);//affiche dans la console
						if (maData.priceAppart && maData.priceHouse){
							routeResponse.render( 'home', {
								error: "No error",
								data: {
									lbcData,
									maData,
									deal : {
										good : isGoodDeal(lbcData,maData),
									},
									
								}
							});
							console.log(isGoodDeal(lbcData,maData));
						}
						else{
							routeResponse.render('home', {
								error:'Unvalid maData'
							});
						}
					}
					else{
						routeResponse.render('home', {
							error:'No data found'
						});	
					}
				}
			}
			else{
				routeResponse.render('home', {
					error:'Error loading the given URL'
				});	
			}
		});	
	}
	else{
			routeResponse.render('home', {
				error:'Unvalid LBC_Data veuillez entrer un nouvel URL'
			});
	}
}

function parseMAData (html) {
	
	const priceAppartRegex = /\bappartement\b : (\d+) €/mi
	const priceHouseRegex = /\bmaison\b : (\d+) €/mi
	
	if(html)
	{
		const priceAppart = priceAppartRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceAppartRegex.exec( html )[1] :0
		const priceHouse = priceHouseRegex.exec( html ) && priceHouseRegex.exec( html ).length === 2 ? priceHouseRegex.exec( html )[1] :0
		if (priceAppart && priceHouse){
			return maData = {
				priceAppart,
				priceHouse
			}
		}
	}
	
}

function isGoodDeal (lbcData, maData) {
	
	console.log("dans good deal");
	const adPricePerSqM = Math.round(lbcData.price/lbcData.surface) 
	
	const maPrice = lbcData.type ==='appartement' ?maData.priceAppart : maData.priceHouse
	
	return adPricePerSqM < maPrice
}


//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});