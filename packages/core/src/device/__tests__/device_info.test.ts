import * as deviceInfo from '../deviceInfo';

test('cpu_usage returns a number between 0 and 100', async () => {
  const usage = await deviceInfo.cpu_usage();
  expect(usage).toBeGreaterThanOrEqual(0);
  expect(usage).toBeLessThanOrEqual(100);
});

test('ram_free returns a non-negative number', async () => {
  const free = await deviceInfo.ram_free();
  expect(free).toBeGreaterThanOrEqual(0);
});

test('storage_capacity returns a positive number', async () => {
  const capacity = await deviceInfo.storage_capacity();
  expect(capacity).toBeGreaterThan(0);
});

test('cpu_info returns a CPUPerformance object', async () => {
  const cpu_info = await deviceInfo.cpu_info();
  expect(cpu_info).toBeDefined();
});

test('name returns a string', async () => {
  const name = await deviceInfo.name();
  expect(name).toBeDefined();
  expect(typeof name).toBe('string');
});

test('ram_usage returns a number between 0 and 100', async () => {
  const usage = await deviceInfo.ram_usage();
  expect(usage).toBeGreaterThanOrEqual(0);
  expect(usage).toBeLessThanOrEqual(100);
});

test('ram_total returns a positive number', async () => {
  const total = await deviceInfo.ram_total();
  expect(total).toBeGreaterThan(0);
});

test('battery_status returns a number between 0 and 100', async () => {
  const status = await deviceInfo.battery_status();
  expect(status).toBeGreaterThanOrEqual(0);
  expect(status).toBeLessThanOrEqual(100);
});

test('battery_time_remaining returns a number', async () => {
  const time = await deviceInfo.battery_time_remaining();
  expect(time).toBeGreaterThanOrEqual(0);
});

test('system_info returns a string', async () => {
  const info = await deviceInfo.system_info();
  expect(info).toBeDefined();
  expect(typeof info).toBe('string');
});

test('services returns a string', async () => {
  const info = await deviceInfo.services();
  expect(info).toBeDefined();
  expect(typeof info).toBe('string');
});

test('block_devices returns a string', async () => {
  const info = await deviceInfo.block_devices();
  expect(info).toBeDefined();
  expect(typeof info).toBe('string');
});


test('fs_size returns a string', async () => {
  const info = await deviceInfo.fs_size();
  expect(info).toBeDefined();
  expect(typeof info).toBe('string');
});
