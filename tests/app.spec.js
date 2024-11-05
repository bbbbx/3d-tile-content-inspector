// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const url = 'http://127.0.0.1:5504';

test.beforeEach(async ({ page }) => {
  await page.goto(url + '/src');
});

test('can inspect b3dm by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedTranslucent/batchedTranslucent.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/batchedTranslucentOpaqueMix.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedWithBatchTable/batchedWithBatchTable.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"batchTableJson"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Classification/Photogrammetry/content.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/root.b3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"b3dm"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/b3dm/);
});

test('can inspect i3dm by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Instanced/InstancedOrientation/instancedOrientation.i3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"i3dm"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"INSTANCES_LENGTH"\s*:\s*25/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"\s*:\s*{/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"NORMAL_UP"\s*:\s*{/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"NORMAL_RIGHT"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/i3dm/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Instanced/InstancedWithBatchTable/instancedWithBatchTable.i3dm'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"i3dm"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"batchTableJson"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/i3dm/);
});

test('can inspect pnts by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudWithPerPointProperties/pointCloudWithPerPointProperties.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"batchTableJson"\s*:\s*{/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudBatched/pointCloudBatched.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"batchTableJson"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudConstantColor/pointCloudConstantColor.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"CONSTANT_RGBA"\s*:\s*\[/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudNormals/pointCloudNormals.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"NORMAL"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"RGB"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/0.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"batchTableJson"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);
  
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/44.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"Classification"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);
});

test('can inspect pnts with Draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudDraco/pointCloudDraco.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"3DTILES_draco_point_compression"\s*:\s*{/);
});

test('can inspect cmpt by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Composite/Composite/composite.cmpt'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"cmpt"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"tilesLength"\s*:\s*2/);
});

test('can inspect glb by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'glb/Box.glb'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"JSON"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/glTF/);

  await fileChooser.setFiles(path.join(__dirname, 'glb/DamagedHelmet.glb'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"JSON"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/glTF/);
});

test('can inspect glb with draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'glb/Box_Draco.glb'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"KHR_draco_mesh_compression"\s*:\s*{/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/glTF/);
});

test('can inspect triangular mesh draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'draco/bunny.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/bone.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/throw_14.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);
});

test('can inspect point cloud draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'draco/pc_color.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"POINT_CLOUD"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/point_cloud_no_qp.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"POINT_CLOUD"/);
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);
});
