#!/usr/bin/env python3
"""
简化的测试运行脚本
可以通过命令行参数控制测试数量
"""

import sys
import os
import argparse

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli_tools.test_agent import AgentTester


def main():
    parser = argparse.ArgumentParser(description='Agent API 测试工具')
    parser.add_argument('-n', '--number', type=int, default=3, 
                        help='测试问题数量 (默认: 3)')
    parser.add_argument('-d', '--delay', type=float, default=2.0,
                        help='问题间隔时间/秒 (默认: 2.0，设为0表示无间隔)')
    parser.add_argument('--column', type=str, default=None,
                        help='指定问题列名 (默认: 自动检测)')
    parser.add_argument('--all', action='store_true',
                        help='测试所有问题 (忽略 -n 参数)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🤖 Agent API 测试工具")
    print("=" * 60)
    
    # 创建测试器
    try:
        tester = AgentTester()
        
        # 设置测试参数
        max_questions = None if args.all else args.number
        
        print(f"📋 测试配置:")
        print(f"   问题数量: {'全部' if args.all else args.number}")
        print(f"   请求间隔: {args.delay}秒")
        print(f"   问题列名: {args.column or '自动检测'}")
        print()
        
        # 运行测试
        results = tester.run_tests(
            question_column=args.column,
            max_questions=max_questions,
            delay_seconds=args.delay
        )
        
        if results:
            # 保存结果
            filename = tester.save_results()
            
            # 显示失败的测试
            tester.print_failed_tests()
            
            print(f"\n📊 测试完成！结果已保存到: {filename}")
            
            # 显示成功率
            success_count = len([r for r in results if r['success']])
            success_rate = success_count / len(results) * 100
            
            if success_rate == 100:
                print("🎉 所有测试都成功！")
            elif success_rate >= 80:
                print(f"✅ 测试成功率: {success_rate:.1f}% (良好)")
            elif success_rate >= 50:
                print(f"⚠️  测试成功率: {success_rate:.1f}% (需要改进)")
            else:
                print(f"❌ 测试成功率: {success_rate:.1f}% (存在问题)")
        
    except KeyboardInterrupt:
        print("\n用户中断测试")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
