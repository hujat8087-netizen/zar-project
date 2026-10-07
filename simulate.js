const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Sim client connected:', socket.id);

  const order = {
    waiterName: 'Ahmad',
    tableNumber: 3,
    note: 'Demo order',
    items: [
      { id: 'kabuli', name: 'Kabuli Pulao / قابلي پلو', price: 250, qty: 2, image: 'kabuli.jpg' },
      { id: 'soda', name: 'Soda / سوډا', price: 40, qty: 2, image: 'soda.jpg' }
    ]
  };

  socket.emit('new_order', order, (response) => {
    if (!response || !response.ok) {
      console.error('Order failed:', response);
      process.exit(1);
    }

    console.log('Created order:', response.order.id);

    setTimeout(() => {
      socket.emit('mark_order_ready', { orderId: response.order.id }, (readyResponse) => {
        console.log('Ready response:', readyResponse);

        setTimeout(() => {
          socket.emit('checkout_table', { tableNumber: order.tableNumber, paymentMethod: 'Cash' }, (checkoutResponse) => {
            console.log('Checkout response:', checkoutResponse);
            process.exit(checkoutResponse && checkoutResponse.ok ? 0 : 1);
          });
        }, 800);
      });
    }, 800);
  });
});

socket.on('snapshot', (data) => {
  console.log('[snapshot]', {
    activeOrders: data.activeOrders.length,
    paidBills: data.orderHistory.length,
    revenue: data.totalRevenue
  });
});
