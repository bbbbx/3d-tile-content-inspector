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
});

test('can inspect big pnts file by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/44.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"Classification"\s*:\s*{/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);
});

test('can inspect pnts with Draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudDraco/pointCloudDraco.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"3DTILES_draco_point_compression"\s*:\s*{/, { timeout: 3e4 });
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
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/bone.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/throw_14.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"TRIANGULAR_MESH"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);
});

test('can inspect point cloud draco by choosing file', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'draco/pc_color.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"POINT_CLOUD"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);

  await fileChooser.setFiles(path.join(__dirname, 'draco/point_cloud_no_qp.drc'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"geometryType"\s*:\s*"POINT_CLOUD"/, { timeout: 3e4 });
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"POSITION"/, { timeout: 3e4 });
  await expect(page.locator("[id='hexViewer']")).toContainText(/DRACO/);
});

test('feedback link opens a prefilled GitHub issue', async ({ page }) => {
  // Don't hit GitHub from tests; just capture the URL the popup navigates to.
  await page.context().route('https://github.com/**', route => route.fulfill({ body: '' }));

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'glb/Box.glb'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"asset"/);

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Feedback' }).click();
  const popup = await popupPromise;

  const issueUrl = new URL(popup.url());
  expect(issueUrl.origin + issueUrl.pathname).toBe('https://github.com/bbbbx/3d-tile-content-inspector/issues/new');
  expect(issueUrl.searchParams.get('body')).toContain('- File: Box.glb');
});

test('start screen offers samples that can be inspected', async ({ page }) => {
  await expect(page.locator("[id='hexViewer']")).toContainText('Load a file to see its bytes.');

  await page.getByRole('button', { name: /\.pnts/ }).click();
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator("[id='hexViewer']")).toContainText(/pnts/);
  await expect(page.getByRole('button', { name: /\.pnts/ })).toHaveCount(0);
});

// --sec-flash in style.css
const FLASH_COLOR = 'rgb(255, 223, 93)';

test('hex viewer colours sections and the legend jumps to them', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the hex viewer is hidden on narrow screens');
  await page.setViewportSize({ width: 1600, height: 900 });

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm'));

  const legend = page.locator('.hex-legend');
  await expect(legend).toContainText('b3dm header');
  await expect(legend).toContainText('Feature table JSON');
  await expect(legend).toContainText('glTF BIN chunk');
  await expect(page.locator('.hex-line').first()).toHaveClass(/sec-header/);

  const glbItem = legend.locator('.hex-legend-item', { hasText: 'glTF header' });
  const sectionId = await glbItem.getAttribute('data-target');
  await glbItem.click();
  const firstLine = page.locator(`.hex-line[data-section="${sectionId}"], .hex-line [data-section="${sectionId}"]`).first();
  await expect(firstLine).toBeInViewport();
  await expect(firstLine).toHaveCSS('background-color', FLASH_COLOR);
});

test('clicking a field in the JSON view reveals its bytes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the hex viewer is hidden on narrow screens');
  await page.setViewportSize({ width: 1600, height: 900 });

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Composite/Composite/composite.cmpt'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"cmpt"/);

  // "featureTableJson" of tiles[1] (the i3dm), not tiles[0].
  const point = await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    const lines = [];
    for (let i = 0; i < cm.lineCount(); i++) {
      if (/^\s*"featureTableJson":/.test(cm.getLine(i))) {
        lines.push(i);
      }
    }
    cm.scrollIntoView({ line: lines[1], ch: 0 }, 100);
    const coords = cm.charCoords({ line: lines[1], ch: cm.getLine(lines[1]).indexOf('"') + 2 }, 'window');
    return { x: coords.left, y: (coords.top + coords.bottom) / 2 };
  });
  await page.mouse.click(point.x, point.y);

  const sectionId = await page.locator('.hex-legend-item', { hasText: 'tiles[1] · Feature table JSON' }).getAttribute('data-target');
  const firstLine = page.locator(`.hex-line[data-section="${sectionId}"], .hex-line [data-section="${sectionId}"]`).first();
  await expect(firstLine).toBeInViewport();
  await expect(firstLine).toHaveCSS('background-color', FLASH_COLOR);
});

test('download link of a previous b3dm is removed when the next file has none', async ({ page }) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('choose a file').click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm'));
  await expect(page.locator('#download')).toHaveText('Click to download batchedColors.b3dm.glb');

  await fileChooser.setFiles(path.join(__dirname, 'Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  await expect(page.locator('#download')).toHaveCount(0);
});

test('overlapping inspections each get their own result', async ({ page }) => {
  const magics = await page.evaluate(async () => {
    const { inspect } = await import('./inspect.js');
    const load = async file => (await fetch('../tests/' + file)).arrayBuffer();
    const [b3dm, pnts] = await Promise.all([
      load('Cesium3DTiles/Batched/BatchedColors/batchedColors.b3dm'),
      load('Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts'),
    ]);
    // Start both before either hex dump comes back.
    const results = await Promise.all([inspect(b3dm, 'a.b3dm'), inspect(pnts, 'b.pnts')]);
    return results.map(result => result.magic);
  });
  expect(magics).toEqual(['b3dm', 'pnts']);
});

test('?url= loads a file on startup', async ({ page }) => {
  await page.goto(url + '/src/?url=' + encodeURIComponent(url + '/tests/Cesium3DTiles/PointCloud/PointCloudRGB/pointCloudRGB.pnts'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);

  // Relative to the page, as the samples are.
  await page.goto(url + '/src/?url=samples/composite.cmpt');
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"cmpt"/);
});

test('samples are shareable via ?url= and a local file drops it', async ({ page }) => {
  await page.getByRole('button', { name: /\.pnts/ }).click();
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"magic"\s*:\s*"pnts"/);
  expect(new URL(page.url()).searchParams.get('url')).toBe('samples/pointCloudRGB.pnts');

  // A local file is not shareable, so the parameter is dropped.
  await page.locator('#file').setInputFiles(path.join(__dirname, 'glb/Box.glb'));
  await expect(page.locator("[id='jsonViewer']")).toContainText(/"asset"/);
  expect(new URL(page.url()).searchParams.has('url')).toBe(false);
});

test('reports URLs that cannot be loaded', async ({ page }) => {
  const open = fileUrl => page.goto(url + '/src/?url=' + encodeURIComponent(fileUrl));

  await open(url + '/tests/missing.b3dm');
  await expect(page.locator('#error')).toContainText('404');

  // Unreachable server: reported like a CORS failure, with the workaround.
  await open('http://127.0.0.1:1/tile.b3dm');
  await expect(page.locator('#error')).toContainText('Download the file and drop it here instead.');

  await open('ftp://example.com/tile.b3dm');
  await expect(page.locator('#error')).toContainText('Only http(s) URLs are supported');
});
