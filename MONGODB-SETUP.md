# د MongoDB تنظیم

دا پروژه اوس مالي معلومات په MongoDB کې ساتي. ډیفالټ اتصال:

`mongodb://127.0.0.1:27017`

او د ډیټابیس نوم:

`pizza_point`

لومړی MongoDB Community Server چالان کړئ، بیا:

```powershell
npm.cmd start
```

که MongoDB Atlas یا بل سرور کاروئ، له پیل مخکې متغیرونه وټاکئ:

```powershell
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@HOST/pizza_point"
$env:MONGODB_DB="pizza_point"
npm.cmd start
```

په لومړي اتصال کې پخواني `data/expenses.json` او `data/monthly-account.json` معلومات په اوتومات ډول MongoDB ته انتقالېږي. وروسته ټول نوی خرڅلاو، مصرف، کارمند، معاش او کرایه په MongoDB کې خوندي کېږي.
