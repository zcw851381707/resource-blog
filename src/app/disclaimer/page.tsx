export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-10 pb-32 md:pb-10">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">免责声明</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">更新日期：2026年</p>

      <div className="space-y-8 text-sm text-[var(--text-secondary)] leading-relaxed">
        {/* 版权声明 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">版权声明</h2>
          <p className="mb-3">
            本网站为影视资源导航与索引平台，不存储任何视频源文件于本站服务器。本站所展示的全部影视资源均来源于互联网公开渠道收集整理，以网盘链接形式供用户访问。
          </p>
          <p className="mb-3">
            本站展示的所有影视作品，包括但不限于片名、封面图片、剧情简介、演员信息等相关内容，其著作权、版权及一切相关权利均归原作品的制作公司、发行方、播出平台及合法版权持有人所有。本站对上述任何作品不主张任何形式的版权或所有权。
          </p>
          <p>
            本站所有封面图片及介绍文字仅用于作品识别与导航目的，不用于任何商业用途。若相关图片或文字内容涉及版权问题，请版权方通过以下邮箱与我们联系，本站将在核实后立即删除相关内容。
          </p>
        </section>

        {/* 版权方通知 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">版权方通知</h2>
          <p className="mb-3">若您是相关影视作品的版权持有方或其授权代理人，认为本站内容侵犯了您的合法权益，请联系我们并提供以下材料：</p>
          <ul className="list-disc pl-6 mb-3 space-y-1">
            <li>您的身份证明及版权归属证明；</li>
            <li>涉嫌侵权内容的具体页面地址；</li>
            <li>您的联系方式及书面侵权声明。</li>
          </ul>
          <p className="mb-2">
            📧 联系邮箱：<a href="mailto:vince851@sohu.com" className="text-[var(--brand)] hover:underline">vince851@sohu.com</a>
          </p>
          <p>本站承诺在收到有效通知后 <strong>72小时内</strong> 核实并处理，删除或屏蔽相关内容。</p>
        </section>

        {/* 用户使用规范 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">用户使用规范</h2>
          <p className="mb-3">
            本站所有内容仅供资源共享、学习参考之用，严禁用于任何商业目的。本站不以任何形式贩卖资源，所有内容均不作为商业行为。
          </p>
          <p className="mb-3">访问或下载本站内容即表示您同意并承诺：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>您下载的全部内容须在下载后24小时内从您的设备中彻底删除；</li>
            <li>您不会将本站任何资源用于商业传播、售卖或牟利；</li>
            <li>您不会将本站资源进行二次分发或上传至其他平台；</li>
            <li>您仅将所获取的内容用于个人学习与欣赏目的。</li>
          </ul>
        </section>

        {/* 内容与访问限制 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">内容与访问限制</h2>
          <p className="mb-3">
            本站收录内容来自多个国家和地区，部分内容可能与您所在地区现行法律法规存在冲突。访问本站即表示您已自行评估并愿意承担所在地区的相关法律责任，本站对此不承担任何连带责任。
          </p>
          <p>
            本站内容仅限18周岁及以上成年人访问，访问即视为您已确认年满18周岁。
          </p>
        </section>

        {/* 责任限制 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">责任限制</h2>
          <p className="mb-3">
            本站对所提供资源链接的持续有效性不作永久保证，如遇链接失效、内容变更等情况，本站将尽力及时更新，但不对此承担任何赔偿责任。因访问或使用本站资源所产生的一切直接或间接损失，由用户自行承担，本站概不负责。
          </p>
        </section>

        {/* 条款变更 */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">条款变更</h2>
          <p>
            本站保留随时修改、更新或终止服务的权利，无需事先通知。免责声明如有更新，更新后即时生效。
          </p>
        </section>

        {/* 底部确认 */}
        <div className="border-t border-[var(--border)] pt-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            访问本站即视为您已完整阅读并同意以上全部条款。
          </p>
        </div>
      </div>
    </div>
  )
}
