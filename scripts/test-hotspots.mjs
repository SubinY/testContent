// 测试热点抓取功能
import { fetchDailyHotspots } from '../lib/daily-hotspots.ts';

console.log('开始测试热点抓取...\n');

try {
  const sources = await fetchDailyHotspots();
  
  console.log(`✅ 成功抓取 ${sources.length} 个渠道的热点\n`);
  
  sources.forEach((source, index) => {
    console.log(`\n【${index + 1}】${source.name}`);
    console.log(`   链接: ${source.url}`);
    console.log(`   热点数量: ${source.titles.length}`);
    console.log(`   热点列表:`);
    source.titles.slice(0, 10).forEach((title, i) => {
      console.log(`     ${i + 1}. ${title}`);
    });
    if (source.titles.length > 10) {
      console.log(`     ... 还有 ${source.titles.length - 10} 条`);
    }
  });
  
  console.log('\n✅ 测试完成！');
} catch (error) {
  console.error('❌ 测试失败:', error);
  console.error('错误详情:', error instanceof Error ? error.stack : error);
  process.exit(1);
}



