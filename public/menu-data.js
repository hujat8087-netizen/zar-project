(function () {
  const menuGroups = [
      {
        id: 'biryani',
        name: 'Biryani',
        localName: 'بریانی',
        image: 'beryani.png',
        filter: 'food',
        theme: 'biryani',
        sections: [
          {
            id: 'biryani-types',
            title: 'Biryani',
            titleLocal: 'بریانی',
            variants: [
              { id: 'biryani-regular', label: 'بریانی', labelEn: 'Biryani', price: 120 },
              { id: 'biryani-boti', label: 'بوټي بریانی', labelEn: 'Boti Biryani', price: 130 },
              { id: 'biryani-shami', label: 'شامي بریانی', labelEn: 'Shami Biryani', price: 130 },
              { id: 'biryani-reshmi', label: 'ریشمي بریانی', labelEn: 'Reshmi Biryani', price: 130 },
              { id: 'biryani-plain', label: 'ساده بریانی', labelEn: 'Plain Biryani', price: 100 },
              { id: 'biryani-mutton', label: 'مټن بریانی', labelEn: 'Mutton Biryani', price: 200 },
              { id: 'biryani-albaik-special', label: 'زرچنار اسپیشل بریانی', labelEn: 'Zarchinar Special Biryani', price: 200 }
            ]
          }
        ]
      },
      {
        id: 'qabili-pulao',
        name: 'Qabili Pulao',
        localName: 'قابلي پلو',
        image: 'kabuli.jpg',
        filter: 'food',
        theme: 'biryani',
        sections: [
          {
            id: 'qabili-pulao-types',
            title: 'Qabili Pulao',
            titleLocal: 'قابلي پلو',
            variants: [
              { id: 'qabili-pulao-regular', label: 'قابلي پلو', labelEn: 'Qabili Pulao', price: 180 },
              { id: 'qabili-pulao-plain', label: 'ساده پلو', labelEn: 'Plain Pulao', price: 100 },
              { id: 'qabili-pulao-boti', label: 'بوټي پلو', labelEn: 'Boti Pulao', price: 180 },
              { id: 'qabili-pulao-shami', label: 'شامي پلو', labelEn: 'Shami Pulao', price: 180 },
              { id: 'qabili-pulao-reshmi', label: 'ریشمي پلو', labelEn: 'Reshmi Pulao', price: 180 },
              { id: 'qabili-pulao-mahicha', label: 'ماهیچه پلو', labelEn: 'Mahicha Pulao', price: 350 }
            ]
          }
        ]
      },
      {
        id: 'kebab',
        name: 'Kebab',
        localName: 'کباب',
        image: 'kabab.jpg',
        filter: 'food',
        theme: 'kebab',
        sections: [
          {
            id: 'kebab-types',
            title: 'Kebabs',
            titleLocal: 'کبابونه',
            variants: [
              { id: 'kebab-tikka', label: 'تکه کباب', labelEn: 'Tikka Kebab', price: 220 },
              { id: 'kebab-shami', label: 'شامي کباب', labelEn: 'Shami Kebab', price: 180 },
              { id: 'kebab-reshmi', label: 'ریشمي کباب', labelEn: 'Reshmi Kebab', price: 180 },
              { id: 'kebab-boti', label: 'بوټي کباب', labelEn: 'Boti Kebab', price: 200 },
              { id: 'kebab-malai-boti', label: 'ملایي بوټي کباب', labelEn: 'Malai Boti Kebab', price: 200 },
              { id: 'kebab-chicken-wings', label: 'چکن وینګز کباب', labelEn: 'Chicken Wings Kebab', price: 180 },
              { id: 'kebab-chopan', label: 'چوپان کباب', labelEn: 'Chopan Kebab', price: 250 },
              { id: 'kebab-half-alqaim', label: 'نیم القیم', labelEn: 'Half Al-Qaim', size: '4 دانې', price: 250 },
              { id: 'kebab-full-alqaim', label: 'مکمل القیم', labelEn: 'Full Al-Qaim', price: 500 },
              { id: 'kebab-karach', label: 'کرچ', labelEn: 'Karach', price: 450 }
            ]
          }
        ]
      },
      {
        id: 'pizza',
        name: 'Zar Chinar Pizza',
        localName: 'زر چنار پیزا',
        image: 'zar-chinar-pizza-menu.png',
        filter: 'food',
        sections: [
          {
            id: 'pizza-special',
            title: 'Special Pizza',
            titleLocal: 'سپیشل پیزا',
            variants: [
              { id: 'pizza-special-s', label: 'سپیشل پیزا', labelEn: 'Special Pizza', size: 'S', price: 170 },
              { id: 'pizza-special-m', label: 'سپیشل پیزا', labelEn: 'Special Pizza', size: 'M', price: 300 },
              { id: 'pizza-special-l', label: 'سپیشل پیزا', labelEn: 'Special Pizza', size: 'L', price: 500 },
              { id: 'pizza-special-xl', label: 'سپیشل پیزا', labelEn: 'Special Pizza', size: 'XL', price: 800 }
            ]
          },
          {
            id: 'pizza-hot-spicy',
            title: 'Hot Spicy Pizza',
            titleLocal: 'هاټ سپایسي پیزا',
            variants: [
              { id: 'pizza-hot-spicy-s', label: 'هاټ سپایسي پیزا', labelEn: 'Hot Spicy Pizza', size: 'S', price: 150 },
              { id: 'pizza-hot-spicy-m', label: 'هاټ سپایسي پیزا', labelEn: 'Hot Spicy Pizza', size: 'M', price: 270 },
              { id: 'pizza-hot-spicy-l', label: 'هاټ سپایسي پیزا', labelEn: 'Hot Spicy Pizza', size: 'L', price: 470 },
              { id: 'pizza-hot-spicy-xl', label: 'هاټ سپایسي پیزا', labelEn: 'Hot Spicy Pizza', size: 'XL', price: 750 }
            ]
          },
          {
            id: 'pizza-chicken-tikka',
            title: 'Chicken Tikka Pizza',
            titleLocal: 'چکن تکه پیزا',
            variants: [
              { id: 'pizza-chicken-tikka-s', label: 'چکن تکه پیزا', labelEn: 'Chicken Tikka Pizza', size: 'S', price: 150 },
              { id: 'pizza-chicken-tikka-m', label: 'چکن تکه پیزا', labelEn: 'Chicken Tikka Pizza', size: 'M', price: 270 },
              { id: 'pizza-chicken-tikka-l', label: 'چکن تکه پیزا', labelEn: 'Chicken Tikka Pizza', size: 'L', price: 470 },
              { id: 'pizza-chicken-tikka-xl', label: 'چکن تکه پیزا', labelEn: 'Chicken Tikka Pizza', size: 'XL', price: 750 }
            ]
          },
          {
            id: 'pizza-rolls',
            title: 'Pizza & Shawarma Rolls',
            titleLocal: 'پیزا او شورمه رول',
            variants: [
              { id: 'pizza-roll', label: 'پیزا رول', labelEn: 'Pizza Roll', size: 'ROLL', price: 120 },
              { id: 'pizza-shawarma-roll', label: 'شورمه رول', labelEn: 'Shawarma Roll', size: 'ROLL', price: 70 }
            ]
          }
        ]
      },
      {
        id: 'fast-food',
        name: 'Burger',
        localName: 'برګر',
        image: 'burgur.jpg',
        filter: 'food',
        theme: 'burger',
        sections: [
          {
            id: 'fast-food-types',
            title: 'Burger',
            titleLocal: 'برګر',
            variants: [
              { id: 'burger-chicken', label: 'چکن برګر', labelEn: 'Chicken Burger', price: 120 },
              { id: 'burger-chicken-cheese', label: 'چکن چیز برګر', labelEn: 'Chicken Cheese Burger', price: 150 },
              { id: 'burger-zinger', label: 'زینګر برګر', labelEn: 'Zinger Burger', price: 150 },
              { id: 'burger-zinger-cheese', label: 'زینګر چیز برګر', labelEn: 'Zinger Cheese Burger', price: 170 },
              { id: 'burger-beef', label: 'بیف برګر', labelEn: 'Beef Burger', price: 120 },
              { id: 'burger-beef-cheese', label: 'بیف چیز برګر', labelEn: 'Beef Cheese Burger', price: 150 },
              { id: 'burger-special-broast', label: 'سپیشل بروسټ', labelEn: 'Special Broast', price: 150 }
            ]
          }
        ]
      },
      {
        id: 'broast',
        name: 'Broast',
        localName: 'بروسټ',
        image: 'bro.png',
        filter: 'food',
        theme: 'burger',
        sections: [
          {
            id: 'broast-types',
            title: 'Broast',
            titleLocal: 'بروسټ',
            variants: [
              { id: 'broast-family', label: 'فامیلي بروسټ', labelEn: 'Family Broast', price: 1000 },
              { id: 'broast-medium', label: 'میانه بروسټ', labelEn: 'Medium Broast', price: 350 },
              { id: 'broast-chicken-tender', label: 'چکن تندر', labelEn: 'Chicken Tender', price: 250 },
              { id: 'broast-winger', label: 'وینګر بروسټ', labelEn: 'Winger Broast', size: '10 دانې', price: 200 },
              { id: 'broast-finger-fish', label: 'فینګر فیش', labelEn: 'Finger Fish', price: 200 }
            ]
          }
        ]
      },
      {
        id: 'mix-platter',
        name: 'Platter',
        localName: 'پلیټر',
        image: 'pletter.png',
        filter: 'food',
        theme: 'platter',
        sections: [
          {
            id: 'mix-platter-sizes',
            title: 'Platter',
            titleLocal: 'پلیټر',
            variants: [
              { id: 'platter-2000', label: 'پلیټر ۲۰۰۰', labelEn: 'Platter 2000', price: 2000 },
              { id: 'platter-1400', label: 'پلیټر ۱۴۰۰', labelEn: 'Platter 1400', price: 1400 },
              { id: 'platter-1000', label: 'پلیټر ۱۰۰۰', labelEn: 'Platter 1000', price: 1000 }
            ]
          }
        ]
      },
      {
        id: 'roll',
        name: 'Roll',
        localName: 'رول',
        image: 'rolle.png',
        filter: 'food',
        theme: 'roll',
        sections: [
          {
            id: 'roll-types',
            title: 'Roll',
            titleLocal: 'رول',
            variants: [
              { id: 'roll-chicken-paratha', label: 'چکن پراته رول', labelEn: 'Chicken Paratha Roll', price: 120 },
              { id: 'roll-shawarma', label: 'شورمه رول', labelEn: 'Shawarma Roll', price: 120 },
              { id: 'roll-shami', label: 'شامي رول', labelEn: 'Shami Roll', price: 120 },
              { id: 'roll-reshmi', label: 'ریشمي رول', labelEn: 'Reshmi Roll', price: 120 },
              { id: 'roll-chicken-malai-boti', label: 'چکن ملایي بوټي رول', labelEn: 'Chicken Malai Boti Roll', price: 120 },
              { id: 'roll-doner', label: 'ډونر رول', labelEn: 'Doner Roll', price: 170 }
            ]
          }
        ]
      },
      {
        id: 'bread',
        name: 'Bread',
        localName: 'ډوډۍ',
        image: 'pood.jpg',
        filter: 'food',
        sections: [
          {
            id: 'bread-types',
            title: 'Bread',
            titleLocal: 'ډوډۍ',
            variants: [
              { id: 'bread-pood', label: 'Pood', labelEn: 'Pood', price: 10 }
            ]
          }
        ]
      },
      {
        id: 'roosh',
        name: 'Roosh',
        localName: 'روش',
        image: 'roush.png',
        filter: 'food',
        sections: [
          {
            id: 'roosh-types',
            title: 'Roosh',
            titleLocal: 'روش',
            variants: [
              { id: 'roosh-regular', label: 'روش', labelEn: 'Roosh', price: 250 }
            ]
          }
        ]
      },
      {
        id: 'karaye',
        name: 'Karahi',
        localName: 'کړایي',
        image: 'karaye.jpg',
        filter: 'food',
        theme: 'karaye',
        sections: [
          {
            id: 'karaye-types',
            title: 'Karahi',
            titleLocal: 'کړایي',
            variants: [
              { id: 'karahi-chicken-kilo', label: 'چکن کړایي', labelEn: 'Chicken Karahi', size: 'کیلو', price: 600 },
              { id: 'karahi-chicken-serving', label: 'چکن کړایي', labelEn: 'Chicken Karahi', size: 'چرایي', price: 200 },
              { id: 'karahi-chicken-white-kilo', label: 'چکن وایټ کړایي', labelEn: 'Chicken White Karahi', size: 'کیلو', price: 700 },
              { id: 'karahi-chicken-white-serving', label: 'چکن وایټ کړایي', labelEn: 'Chicken White Karahi', size: 'چرایي', price: 240 },
              { id: 'karahi-mutton-kilo', label: 'مټن کړایي', labelEn: 'Mutton Karahi', size: 'کیلو', price: 750 },
              { id: 'karahi-mutton-white-kilo', label: 'مټن وایټ کړایي', labelEn: 'Mutton White Karahi', size: 'کیلو', price: 800 },
              { id: 'karahi-chicken-handi-kilo', label: 'چکن هنډي کړایي', labelEn: 'Chicken Handi Karahi', size: 'کیلو', price: 650 },
              { id: 'karahi-chicken-handi-serving', label: 'چکن هنډي کړایي', labelEn: 'Chicken Handi Karahi', size: 'چرایي', price: 220 },
              { id: 'karahi-chicken-white-handi-kilo', label: 'چکن وایټ هنډي کړایي', labelEn: 'Chicken White Handi Karahi', size: 'کیلو', price: 720 },
              { id: 'karahi-chicken-white-handi-serving', label: 'چکن وایټ هنډي کړایي', labelEn: 'Chicken White Handi Karahi', size: 'چرایي', price: 220 },
              { id: 'karahi-mutton-handi-kilo', label: 'مټن هنډي کړایي', labelEn: 'Mutton Handi Karahi', size: 'کیلو', price: 800 },
              { id: 'karahi-mutton-white-handi-kilo', label: 'مټن وایټ هنډي کړایي', labelEn: 'Mutton White Handi Karahi', size: 'کیلو', price: 900 },
              { id: 'karahi-rosh-serving', label: 'روش', labelEn: 'Rosh', size: 'خوراک', price: 260 }
            ]
          }
        ]
      },
      {
        id: 'large-bottles',
        name: 'Large Bottles',
        localName: 'غټ بوتلونه',
        image: 'large.jpg',
        filter: 'drinks',
        theme: 'drinks',
        sections: [
          {
            id: 'large-bottle-types',
            title: 'Large Bottles',
            titleLocal: 'غټ بوتلونه',
            variants: [
              { id: 'large-bottle-cola', label: 'غټ کولا', labelEn: 'Large Cola', price: 60 },
              { id: 'large-bottle-breeze', label: 'غټ بریز', labelEn: 'Large Breeze', price: 60 },
              { id: 'large-bottle-hit-magic', label: 'اټ مجیک', labelEn: 'Hit Magic', price: 60 },
              { id: 'large-bottle-wow', label: 'غټ واو', labelEn: 'Large Wow', price: 60 },
              { id: 'large-bottle-element', label: 'غټ ایلمنټ', labelEn: 'Large Element', price: 60 },
              { id: 'large-bottle-coke', label: 'غټ کوک', labelEn: 'Large Coke', price: 60 },
              { id: 'large-bottle-dew', label: 'اټ ډیو', labelEn: 'Hit Dew', price: 70 },
              { id: 'large-bottle-sprite', label: 'غټ سپرایت', labelEn: 'Large Sprite', price: 60 },
              { id: 'large-bottle-mirinda', label: 'غټ مرندا', labelEn: 'Large Mirinda', price: 60 },
              { id: 'large-bottle-7up', label: 'غټ 7up', labelEn: 'Large 7up', price: 60 },
              { id: 'large-bottle-water', label: 'غټی اوبه', labelEn: 'Large Water', price: 20 }
            ]
          }
        ]
      },
      {
        id: 'small-bottles',
        name: 'Small Bottles',
        localName: 'کوچنی ډبلی',
        image: 'small.jpg',
        filter: 'drinks',
        theme: 'drinks',
        sections: [
          {
            id: 'small-bottle-types',
            title: 'Small Bottles',
            titleLocal: 'کوچنی ډبلی',
            variants: [
              { id: 'small-bottle-sting', label: 'سټینګ', labelEn: 'Sting', price: 30 },
              { id: 'small-bottle-s-ginseng', label: 'ایس ګنک', labelEn: 'S Ginseng', price: 25 },
              { id: 'small-bottle-wow', label: 'واو', labelEn: 'Wow', price: 20 },
              { id: 'small-bottle-coke', label: 'کوک', labelEn: 'Coke', price: 20 },
              { id: 'small-bottle-breeze', label: 'بریز', labelEn: 'Breeze', price: 20 },
              { id: 'small-bottle-magic', label: 'Magic', labelEn: 'Magic', price: 20 },
              { id: 'small-bottle-pepsi', label: 'پیپسي', labelEn: 'Pepsi', price: 30 },
              { id: 'small-bottle-7up', label: '7up', labelEn: '7up', price: 30 },
              { id: 'small-bottle-rani', label: 'راني', labelEn: 'Rani', price: 30 },
              { id: 'small-bottle-aloe-vera', label: 'الوپرا', labelEn: 'Aloe Vera', price: 30 },
              { id: 'small-bottle-predator', label: 'پرډیټر', labelEn: 'Predator', price: 20 },
              { id: 'small-bottle-xrun', label: 'Xrun', labelEn: 'Xrun', price: 20 },
              { id: 'small-bottle-barbican', label: 'باربیکن', labelEn: 'Barbican', price: 70 },
              { id: 'small-water', label: 'کوچنی اوبه', labelEn: 'Small Water', price: 10 },
              { id: 'small-bottle-bermisha-juice', label: 'برمیشا جوس', labelEn: 'Bermisha Juice', price: 10 },
              { id: 'small-bottle-small-monster', label: 'کوچنی منستر', labelEn: 'Small Monster', price: 90 },
              { id: 'small-bottle-power-monster', label: 'پاور منستر', labelEn: 'Power Monster', price: 180 },
              { id: 'small-bottle-purple-monster', label: 'ارغواني کباب منستر', labelEn: 'Purple Monster', price: 160 },
              { id: 'small-bottle-large-monster', label: 'غټ منستر', labelEn: 'Large Monster', price: 130 },
              { id: 'small-bottle-redbull', label: 'ریډ بول', labelEn: 'Red Bull', price: 160 },
              { id: 'small-bottle-ginseng', label: 'جنسینګ', labelEn: 'Ginseng', price: 60 },
              { id: 'small-bottle-sunrise-juice', label: 'سن رایز جوس', labelEn: 'Sunrise Juice', price: 90 },
              { id: 'small-bottle-hit', label: 'هیټ', labelEn: 'Hit', price: 30 },
              { id: 'small-bottle-alkozi', label: 'الکوزی', labelEn: 'Alkozi', price: 40 }
            ]
          }
        ]
      },
      {
        id: 'fresh-bar-juice',
        name: 'Juices',
        localName: 'جوس',
        image: 'juise.jpg',
        filter: 'drinks',
        theme: 'juice',
        sections: [
          {
            id: 'fresh-bar-juice-menu',
            title: 'Juices',
            titleLocal: 'جوس',
            variants: [
              { id: 'juice-banana', label: 'کیله جوس', labelEn: 'Banana Juice', price: 100 },
              { id: 'juice-mango', label: 'ام جوس', labelEn: 'Mango Juice', price: 100 },
              { id: 'juice-chikoo', label: 'چیکو جوس', labelEn: 'Chikoo Juice', price: 100 },
              { id: 'juice-strawberry', label: 'سټرابري جوس', labelEn: 'Strawberry Juice', price: 100 },
              { id: 'juice-apple', label: 'سیب جوس', labelEn: 'Apple Juice', price: 100 },
              { id: 'juice-pineapple', label: 'اناناس جوس', labelEn: 'Pineapple Juice', price: 100 },
              { id: 'juice-persimmon', label: 'املوک جوس', labelEn: 'Persimmon Juice', price: 100 },
              { id: 'juice-pomegranate', label: 'انار جوس', labelEn: 'Pomegranate Juice', price: 100 },
              { id: 'juice-orange', label: 'مالټه جوس', labelEn: 'Orange Juice', price: 100 },
              { id: 'juice-apple-shake', label: 'سیب شیک', labelEn: 'Apple Shake', price: 100 },
              { id: 'juice-date-shake', label: 'خرما شیک', labelEn: 'Date Shake', price: 100 },
              { id: 'juice-mix', label: 'مکس جوس', labelEn: 'Mix Juice', price: 100 },
              { id: 'juice-special-dry-fruit-mixture', label: 'اسپیشل د وچې میوې مکسچر', labelEn: 'Special Dry Fruit Mixture', price: 200 },
              { id: 'juice-special-falooda', label: 'اسپیشل فالوده', labelEn: 'Special Falooda', price: 150 }
            ]
          }
        ]
      },
      {
        id: 'tea-coffee',
        name: 'Tea & Coffee',
        localName: 'چای او کاپي',
        image: 'tea.webp',
        filter: 'tea',
        theme: 'tea',
        sections: [
          {
            id: 'tea-coffee-types',
            title: 'Tea & Coffee',
            titleLocal: 'چای او کاپي',
            variants: []
          }
        ]
      },
      {
        id: 'ice-cream',
        name: 'Ice Cream',
        localName: 'ایسکریم',
        image: 'iscrem.jpg',
        filter: 'dessert',
        theme: 'icecream',
        sections: [
          {
            id: 'ice-cream-types',
            title: 'Ice Cream',
            titleLocal: 'ایسکریم',
            variants: []
          }
        ]
      }
    ];

  const customItems = Array.isArray(window.AsadBurgerKingCustomMenu)
    ? window.AsadBurgerKingCustomMenu
    : [];

  customItems.forEach((item) => {
    const group = menuGroups.find((entry) => entry.id === item.groupId);
    if (!group) return;
    if (!Array.isArray(group.sections) || !group.sections.length) {
      group.sections = [{ id: `${group.id}-custom`, title: group.name, titleLocal: group.localName, variants: [] }];
    }
    const section = group.sections[0];
    if (!Array.isArray(section.variants)) section.variants = [];
    section.variants.push({
      id: item.id,
      label: item.name,
      labelEn: item.englishName || item.name,
      price: Number(item.price) || 0,
      custom: true
    });
  });

  const deletedItemIds = Array.isArray(window.AsadBurgerKingDeletedMenuItems)
    ? window.AsadBurgerKingDeletedMenuItems
    : [];
  if (deletedItemIds.length) {
    const deletedItemSet = new Set(deletedItemIds);
    menuGroups.forEach((group) => {
      (group.sections || []).forEach((section) => {
        section.variants = (section.variants || []).filter((variant) => !deletedItemSet.has(variant.id));
      });
    });
  }

  const savedPrices = window.AsadBurgerKingMenuPrices || {};
  menuGroups.forEach((group) => {
    (group.sections || []).forEach((section) => {
      (section.variants || []).forEach((variant) => {
        const savedPrice = Number(savedPrices[variant.id]);
        if (savedPrice > 0) variant.price = savedPrice;
        if (Array.isArray(variant.priceOptions)) {
          variant.priceOptions = variant.priceOptions.map((price, optionIndex) => {
            const optionPrice = Number(savedPrices[`${variant.id}-option-${optionIndex}`]);
            return optionPrice > 0 ? optionPrice : price;
          });
        }
      });
    });
  });

  window.AsadBurgerKingMenuGroups = menuGroups;

  window.AsadBurgerKingApplyMenuUpdate = function applyMenuUpdate(update) {
    if (!update || !update.action) return false;

    if (update.action === 'added' && update.item) {
      const item = update.item;
      const group = menuGroups.find((entry) => entry.id === item.groupId);
      if (!group) return false;
      if (!Array.isArray(group.sections) || !group.sections.length) {
        group.sections = [{ id: `${group.id}-custom`, title: group.name, titleLocal: group.localName, variants: [] }];
      }
      const section = group.sections[0];
      if (!Array.isArray(section.variants)) section.variants = [];
      if (section.variants.some((variant) => variant.id === item.id)) return false;
      section.variants.push({
        id: item.id,
        label: item.name,
        labelEn: item.englishName || item.name,
        price: Number(item.price) || 0,
        custom: true
      });
      return true;
    }

    if (update.action === 'deleted' && update.itemId) {
      let changed = false;
      menuGroups.forEach((group) => {
        (group.sections || []).forEach((section) => {
          const before = (section.variants || []).length;
          section.variants = (section.variants || []).filter((variant) => variant.id !== update.itemId);
          if (section.variants.length !== before) changed = true;
        });
      });
      return changed;
    }

    if (update.action === 'price_updated' && update.itemId) {
      for (const group of menuGroups) {
        for (const section of (group.sections || [])) {
          const variant = (section.variants || []).find((item) => item.id === update.itemId);
          if (variant) {
            const nextPrice = Number(update.price) || variant.price;
            if (variant.price === nextPrice) return false;
            variant.price = nextPrice;
            return true;
          }
          const optionMatch = String(update.itemId).match(/^(.*)-option-(\d+)$/);
          if (optionMatch) {
            const optionVariant = (section.variants || []).find((item) => item.id === optionMatch[1]);
            const optionIndex = Number(optionMatch[2]);
            if (optionVariant && Array.isArray(optionVariant.priceOptions) && optionIndex < optionVariant.priceOptions.length) {
              const nextPrice = Number(update.price) || optionVariant.priceOptions[optionIndex];
              if (optionVariant.priceOptions[optionIndex] === nextPrice) return false;
              optionVariant.priceOptions[optionIndex] = nextPrice;
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  async function syncSavedMenuPrices() {
    try {
      const response = await fetch('/api/menu/prices', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      let changed = false;
      (data.customItems || []).forEach((item) => {
        if (window.AsadBurgerKingApplyMenuUpdate({ action: 'added', item })) changed = true;
      });
      (data.deletedItemIds || []).forEach((itemId) => {
        if (window.AsadBurgerKingApplyMenuUpdate({ action: 'deleted', itemId })) changed = true;
      });
      Object.entries(data.prices || {}).forEach(([itemId, price]) => {
        if (window.AsadBurgerKingApplyMenuUpdate({ action: 'price_updated', itemId, price })) {
          changed = true;
        }
      });
      if (changed) window.dispatchEvent(new CustomEvent('asad-menu-prices-updated'));
    } catch (_error) {
      // Offline pages keep their last cached menu and retry automatically.
    }
  }

  window.AsadBurgerKingSyncMenuPrices = syncSavedMenuPrices;
  syncSavedMenuPrices();
  window.setInterval(syncSavedMenuPrices, 5000);
}());
