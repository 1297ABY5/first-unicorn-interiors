const https=require('https');
const C={DT:process.env.GOOGLE_ADS_DEVELOPER_TOKEN,CID:process.env.GOOGLE_ADS_CUSTOMER_ID,CI:process.env.GOOGLE_ADS_CLIENT_ID,CS:process.env.GOOGLE_ADS_CLIENT_SECRET,RT:process.env.GOOGLE_ADS_REFRESH_TOKEN};
let T='';
function req(o,d){return new Promise((y,n)=>{const r=https.request(o,s=>{let b='';s.on('data',c=>b+=c);s.on('end',()=>{try{const j=JSON.parse(b);s.statusCode>=400?n(j):y(j)}catch(e){n(b)}})});r.on('error',n);if(d)r.write(d);r.end()})}
async function auth(){const d=`grant_type=refresh_token&client_id=${C.CI}&client_secret=${C.CS}&refresh_token=${C.RT}`;const r=await req({hostname:'oauth2.googleapis.com',path:'/token',method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(d)}},d);T=r.access_token;console.log('Token OK')}
async function m(ops){const d=JSON.stringify({mutateOperations:ops});return req({hostname:'googleads.googleapis.com',path:`/v20/customers/${C.CID}/googleAds:mutate`,method:'POST',headers:{'Authorization':`Bearer ${T}`,'developer-token':C.DT,'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},d)}
const CP='customers/1600550384/campaigns/23590913919';
const AG1='customers/1600550384/adGroups/196477357111';
const ADS=[
{name:'Full Villa Renovation',res:AG1,lp:'https://firstunicorninteriors.com/services',
h:['Villa Renovation Dubai','15+ Years UAE Experience','In-House Team No Subs','800+ Villas Transformed','Free Design Consultation','Turnkey Villa Renovation','Licensed Dubai Contractor','Fixed Price No Surprises','1-Year Warranty Included','WhatsApp Us Today','Direct Material Sourcing','Milestone-Based Payments','Premium Villa Specialists','Transform Your Villa Now','Dubai Licensed Contractor'],
d:['Dubai villa renovation team. In-house design build deliver. 800+ done. WhatsApp us now.','Full villa renovation from AED 80K. No subs no hidden costs. Free site visit today.','15+ years transforming Dubai villas. Kitchen bathroom flooring and more. Free consult.','Premium renovation Palm Jumeirah Arabian Ranches Dubai Hills. 1-year warranty included.']},
{name:'Kitchen Renovation',lp:'https://firstunicorninteriors.com/kitchen-renovation',
kw:[['kitchen renovation dubai','EXACT'],['kitchen renovation dubai','PHRASE'],['kitchen remodel dubai','PHRASE'],['kitchen design dubai','PHRASE'],['modular kitchen dubai','PHRASE'],['kitchen renovation cost dubai','EXACT'],['kitchen cabinets dubai','PHRASE'],['custom kitchen dubai','PHRASE'],['luxury kitchen renovation dubai','EXACT'],['kitchen makeover dubai','PHRASE'],['villa kitchen renovation','PHRASE']],
h:['Kitchen Renovation Dubai','Custom Kitchen Design','Handleless Cabinets','Free Kitchen Consultation','Done in 4-6 Weeks','15+ Years Experience','In-House Joinery Team','Premium Kitchen Makeover','800+ Kitchens Completed','Fixed Price Guarantee','Italian Countertops','No Subcontractors Used','WhatsApp for Free Quote','Transform Your Kitchen','Book a Free Site Visit'],
d:['Complete kitchen renovation. Custom cabinetry premium countertops. In-house team.','Transform your kitchen in 4-6 weeks. Handleless cabinets soft-close. Free consult.','Dubai kitchen specialists. 800+ projects. Direct sourcing better prices. WhatsApp us.','Premium kitchen renovation across Dubai. Transparent pricing 1-year warranty. Call.']},
{name:'Bathroom Renovation',lp:'https://firstunicorninteriors.com/bathroom-renovation',
kw:[['bathroom renovation dubai','EXACT'],['bathroom renovation dubai','PHRASE'],['bathroom remodel dubai','PHRASE'],['bathroom design dubai','PHRASE'],['bathroom renovation cost dubai','EXACT'],['luxury bathroom renovation dubai','EXACT'],['bathroom makeover dubai','PHRASE'],['shower renovation dubai','PHRASE'],['bathroom tiling dubai','PHRASE'],['marble bathroom dubai','PHRASE'],['villa bathroom renovation','PHRASE']],
h:['Bathroom Renovation Dubai','Luxury Bathroom Design','Italian Marble Finishes','Free Bathroom Consult','Completed in 3-4 Weeks','Frameless Glass Showers','In-House Tiling Team','800+ Bathrooms Done','Premium Fixtures','No Hidden Costs','Waterproofing Guaranteed','WhatsApp for Free Quote','Walk-In Shower Experts','Rain Shower Install','15+ Years Experience'],
d:['Complete bathroom renovation. Italian marble frameless glass. Free consultation.','Transform your bathroom in 3-4 weeks. Walk-in rain shower floating vanity. 800+ done.','Dubai bathroom renovation experts. Premium materials 1-year warranty. WhatsApp us.','Luxury bathroom makeover from AED 25K. No subs transparent pricing. Book a visit.']},
{name:'Glass and Aluminium',lp:'https://firstunicorninteriors.com/services',
kw:[['glass partition dubai','EXACT'],['glass partition dubai','PHRASE'],['aluminium works dubai','PHRASE'],['shower glass dubai','PHRASE'],['shower enclosure dubai','PHRASE'],['glass balustrade dubai','PHRASE'],['frameless glass dubai','PHRASE'],['glass railing dubai','PHRASE'],['glass door dubai','PHRASE'],['office glass partition dubai','PHRASE']],
h:['Glass Aluminium Dubai','Frameless Glass Panels','Shower Enclosures Dubai','Glass Balustrades','Custom Aluminium Works','Free Measurement Quote','In-House Install Team','15+ Years Experience','Premium Tempered Glass','Office Partitions Dubai','Quick Turnaround','WhatsApp for Free Quote','Villa Glass Specialists','Precision Aluminium','Licensed and Insured'],
d:['Custom glass and aluminium for villas and offices. Shower enclosures partitions.','Premium frameless glass. Tempered safety glass precision frames. Free measurement.','Dubai glass aluminium specialists. Direct sourcing competitive prices. Call today.','Expert glass aluminium across Dubai. Fast turnaround 1-year warranty. WhatsApp us.']},
{name:'Palm Jumeirah',lp:'https://firstunicorninteriors.com/palm-jumeirah',
kw:[['villa renovation palm jumeirah','EXACT'],['renovation palm jumeirah','PHRASE'],['palm jumeirah villa renovation','EXACT'],['contractor palm jumeirah','PHRASE'],['kitchen renovation palm jumeirah','PHRASE'],['bathroom renovation palm jumeirah','PHRASE']],
h:['Palm Jumeirah Renovation','Villa Experts Since 2010','50+ Palm Projects Done','Free Design Consultation','In-House Team No Subs','Luxury Villa Makeover','Premium Materials Only','WhatsApp for Free Quote','Turnkey Reno Service','800+ Dubai Villas Done','Book a Site Visit Today','We Know The Palm','Fixed Price No Surprise','1-Year Warranty Included','Direct Material Sourcing'],
d:['Palm Jumeirah villa renovation. 50+ projects on the Palm. Full turnkey. Free consult.','We know Palm Jumeirah villas inside out. In-house team transparent pricing. WhatsApp.','Premium renovation for Palm homes. No subs direct sourcing milestone payments. Call.','Transform your Palm Jumeirah villa. 15+ years 800+ projects 1-year warranty. Book.']},
{name:'Arabian Ranches',lp:'https://firstunicorninteriors.com/arabian-ranches',
kw:[['villa renovation arabian ranches','EXACT'],['renovation arabian ranches','PHRASE'],['arabian ranches villa renovation','EXACT'],['contractor arabian ranches','PHRASE'],['kitchen renovation arabian ranches','PHRASE'],['bathroom renovation arabian ranches','PHRASE']],
h:['Arabian Ranches Reno','47+ Ranches Villas Done','Villa Renovation Experts','Free Design Consultation','In-House Team No Subs','From AED 80K Full Reno','15+ Years Experience','WhatsApp for Free Quote','We Know The Ranches','Fixed Price Guarantee','Book a Site Visit Today','Turnkey Villa Renovation','Premium Fair Pricing','1-Year Warranty Included','800+ Dubai Projects Done'],
d:['Arabian Ranches villa renovation. 47+ projects in the community. Free consult today.','We know every Ranches villa type. From AED 80K. In-house team. WhatsApp for quote.','Transform your Arabian Ranches villa. No subs no hidden costs. Book a site visit.','Trusted by Ranches families 15+ years. Full service 1-year warranty. Call today.']},
{name:'Emirates Hills',lp:'https://firstunicorninteriors.com/emirates-hills',
kw:[['villa renovation emirates hills','EXACT'],['renovation emirates hills','PHRASE'],['emirates hills villa renovation','EXACT'],['contractor emirates hills','PHRASE'],['luxury renovation emirates hills','PHRASE'],['interior design emirates hills','PHRASE']],
h:['Emirates Hills Renovation','Ultra-Luxury Specialists','Villa Renovation Experts','Free Design Consultation','In-House Team No Subs','Premium Materials Only','15+ Years Experience','WhatsApp for Free Quote','We Know Emirates Hills','Italian Marble and Stone','Book a Site Visit Today','Turnkey Luxury Service','In-House Design Team','1-Year Warranty Included','800+ Dubai Villas Done'],
d:['Emirates Hills villa renovation. Premium materials in-house design. Free consult.','Ultra-luxury renovation. Italian marble custom joinery smart home. 15+ years exp.','Transform your Emirates Hills home. No subs direct sourcing. WhatsApp us today.','Premier renovation for Emirates Hills. Transparent pricing 1-year warranty. Call.']},
{name:'Dubai Hills',lp:'https://firstunicorninteriors.com/dubai-hills',
kw:[['villa renovation dubai hills','EXACT'],['renovation dubai hills','PHRASE'],['dubai hills villa renovation','EXACT'],['dubai hills estate renovation','PHRASE'],['contractor dubai hills','PHRASE'],['kitchen renovation dubai hills','PHRASE'],['bathroom renovation dubai hills','PHRASE']],
h:['Dubai Hills Renovation','Villa Renovation Experts','Handover Specialists','Free Design Consultation','In-House Team No Subs','From AED 80K Full Reno','15+ Years Experience','WhatsApp for Free Quote','We Know Dubai Hills','Post-Handover Upgrades','Book a Site Visit Today','Turnkey Villa Service','Fixed Price No Surprise','1-Year Warranty Included','800+ Dubai Projects Done'],
d:['Dubai Hills villa renovation. Post-handover upgrades and full renovations. Consult.','Just got your Dubai Hills keys? We do upgrades. WhatsApp for a free quote today.','Transform your Dubai Hills villa. No subs no hidden costs milestone payments. Call.','Premium renovation for Dubai Hills. 15+ years direct sourcing 1-year warranty.']}
];
async function run(){
console.log('\n=== COMPLETING DEPLOYMENT ===\n');
await auth();
// Fix callouts
console.log('Adding callouts...');
try{const co=['15+ Years Experience','In-House Team','Free Site Visit','1-Year Warranty','No Subcontractors','Transparent Pricing','Direct Sourcing','Licensed Contractor'];
const ar=await m(co.map(t=>({assetOperation:{create:{calloutAsset:{calloutText:t}}}})));
await m(ar.mutateOperationResponses.map(r=>({campaignAssetOperation:{create:{campaign:CP,asset:r.assetResult.resourceName,fieldType:'CALLOUT'}}})));
console.log('OK callouts')}catch(e){console.log('SKIP callouts')}
// Process ad groups
for(const a of ADS){
console.log(`\n--- ${a.name} ---`);
let agr=a.res;
if(!agr){
try{const r=await m([{adGroupOperation:{create:{name:a.name,campaign:CP,status:'ENABLED',type:'SEARCH_STANDARD'}}}]);
agr=r.mutateOperationResponses[0].adGroupResult.resourceName;console.log('AG:'+agr)}catch(e){console.log('AG FAIL');continue}}
if(a.kw){
try{await m(a.kw.map(k=>({adGroupCriterionOperation:{create:{adGroup:agr,keyword:{text:k[0],matchType:k[1]},status:'ENABLED'}}})));
console.log('KW OK: '+a.kw.length)}catch(e){console.log('KW FAIL')}}
try{await m([{adGroupAdOperation:{create:{adGroup:agr,status:'ENABLED',ad:{responsiveSearchAd:{headlines:a.h.map(t=>({text:t})),descriptions:a.d.map(t=>({text:t}))},finalUrls:[a.lp]}}}}]);
console.log('AD OK')}catch(e){console.log('AD FAIL:',e?.error?.message||e)}}
console.log('\n=== DONE ===');
console.log('Campaign PAUSED. Go to ads.google.com to enable.\n')}
run().catch(e=>console.error('FATAL:',e));
