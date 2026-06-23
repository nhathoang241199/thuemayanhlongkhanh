import {
  Box,
  Container,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { Metadata } from "next";

import { getSiteTitle } from "@/lib/site-config";
import { userPageBg } from "@/lib/user-theme";

const CONTACT_EMAIL = "nhathoang241199@gmail.com";
const LAST_UPDATED = "22 tháng 6, 2026";

export const metadata: Metadata = {
  title: `Chính sách quyền riêng tư | ${getSiteTitle()}`,
  description:
    "Chính sách quyền riêng tư của Thuê máy ảnh Long Khánh — thu thập, sử dụng và bảo vệ dữ liệu khách hàng.",
};

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <Box as="ul" ps={5} lineHeight="tall">
      {items.map((item, i) => (
        <Box as="li" key={i} mb={2}>
          {item}
        </Box>
      ))}
    </Box>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Heading as="h2" size="md" color="cerulean.800">
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

export default function PrivacyPage() {
  const siteTitle = getSiteTitle();

  return (
    <Box minH="100dvh" bg={userPageBg} py={{ base: 6, md: 10 }}>
      <Container maxW="2xl" px={4}>
        <Stack gap={6}>
          <Stack gap={1}>
            <Heading as="h1" size="xl" color="cerulean.900">
              Chính sách quyền riêng tư
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              {siteTitle} · Cập nhật: {LAST_UPDATED}
            </Text>
          </Stack>

          <Text lineHeight="tall">
            Chính sách này mô tả cách <strong>{siteTitle}</strong> (&quot;chúng
            tôi&quot;, &quot;shop&quot;) thu thập, sử dụng và bảo vệ thông tin
            khi bạn sử dụng website{" "}
            <Link href="https://thuemayanhlongkhanh.com" color="cerulean.700">
              thuemayanhlongkhanh.com
            </Link>
            , đặt lịch thuê máy ảnh, hoặc nhắn tin qua Facebook Messenger của
            fanpage.
          </Text>

          <Section title="1. Dữ liệu chúng tôi thu thập">
            <BulletList
              items={[
                <>
                  <strong>Thông tin liên hệ:</strong> họ tên, số điện thoại, liên
                  kết Facebook (nếu bạn cung cấp).
                </>,
                <>
                  <strong>Tin nhắn Messenger:</strong> nội dung hội thoại giữa
                  bạn và fanpage khi bạn chủ động nhắn tin.
                </>,
                <>
                  <strong>Thông tin đặt thuê:</strong> máy/ống kính, ngày thuê,
                  địa chỉ giao nhận (nếu có), ghi chú đơn hàng.
                </>,
                <>
                  <strong>Xác minh danh tính:</strong> ảnh CCCD/thẻ sinh viên khi
                  shop yêu cầu theo quy định cọc thuê.
                </>,
                <>
                  <strong>Thanh toán:</strong> mã đơn, số tiền, trạng thái thanh
                  toán — chúng tôi không lưu số thẻ ngân hàng.
                </>,
              ]}
            />
          </Section>

          <Section title="2. Mục đích sử dụng">
            <BulletList
              items={[
                <>Tư vấn giá thuê, tình trạng máy còn trống.</>,
                <>Xử lý và quản lý đơn thuê máy ảnh.</>,
                <>Liên hệ xác nhận, giao/trả thiết bị.</>,
                <>
                  Trả lời tự động qua chatbot Messenger (có sử dụng AI — xem mục
                  4).
                </>,
                <>Cải thiện chất lượng dịch vụ và hỗ trợ khách hàng.</>,
              ]}
            />
          </Section>

          <Section title="3. Lưu trữ và bảo mật">
            <Text lineHeight="tall">
              Dữ liệu được lưu trên máy chủ của shop tại Việt Nam, có biện pháp
              truy cập hạn chế (đăng nhập admin, kết nối mã hóa HTTPS). Chúng
              tôi không bán hoặc cho thuê dữ liệu cá nhân của bạn cho bên thứ
              ba vì mục đích marketing.
            </Text>
          </Section>

          <Section title="4. Bên thứ ba và trí tuệ nhân tạo (AI)">
            <Text lineHeight="tall">
              Để vận hành dịch vụ, chúng tôi có thể chia sẻ một phần dữ liệu
              cần thiết với:
            </Text>
            <BulletList
              items={[
                <>
                  <strong>Meta (Facebook):</strong> nền tảng Messenger để gửi/nhận
                  tin nhắn fanpage.
                </>,
                <>
                  <strong>Anthropic (Claude):</strong> xử lý tin nhắn để trả lời
                  tư vấn tự động; nội dung chat có thể được gửi tới API của
                  Anthropic theo{" "}
                  <Link
                    href="https://www.anthropic.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="cerulean.700"
                  >
                    chính sách của Anthropic
                  </Link>
                  .
                </>,
                <>
                  <strong>SePay / ngân hàng:</strong> xử lý chuyển khoản thanh
                  toán đặt cọc theo mã đơn.
                </>,
              ]}
            />
            <Text lineHeight="tall" mt={2}>
              Bot AI chỉ truy vấn thông tin công khai của shop (giá, lịch trống)
              và không tự ý tiết lộ dữ liệu nhạy cảm. Khi cần, bạn có thể yêu
              cầu chuyển sang nhân viên (gõ &quot;AD&quot; hoặc &quot;gặp
              admin&quot; trong Messenger).
            </Text>
          </Section>

          <Section title="5. Thời gian lưu giữ">
            <Text lineHeight="tall">
              Dữ liệu đơn thuê và khách hàng được lưu trong thời gian shop cần
              để quản lý kinh doanh và tuân thủ nghĩa vụ pháp lý. Tin nhắn
              Messenger có thể được lưu trong hệ thống nội bộ để phục vụ hỗ
              trợ và cải thiện bot.
            </Text>
          </Section>

          <Section title="6. Quyền của bạn">
            <Text lineHeight="tall">
              Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân
              của mình, trừ khi pháp luật yêu cầu shop giữ lại.
            </Text>
          </Section>

          <Section title="7. Yêu cầu xóa dữ liệu">
            <Stack gap={2} id="xoa-du-lieu" scrollMarginTop="1rem">
              <Text lineHeight="tall">
                Để yêu cầu xóa dữ liệu (tên, SĐT, lịch sử đơn, tin nhắn đã lưu),
                vui lòng gửi email tới{" "}
                <Link href={`mailto:${CONTACT_EMAIL}`} color="cerulean.700">
                  {CONTACT_EMAIL}
                </Link>{" "}
                hoặc nhắn tin fanpage Facebook <strong>{siteTitle}</strong> kèm:
              </Text>
              <BulletList
                items={[
                  <>Họ tên và số điện thoại đã đăng ký</>,
                  <>Nội dung yêu cầu: xóa / chỉnh sửa dữ liệu</>,
                ]}
              />
              <Text lineHeight="tall">
                Chúng tôi phản hồi trong vòng 30 ngày làm việc sau khi xác minh
                danh tính.
              </Text>
            </Stack>
          </Section>

          <Section title="8. Thay đổi chính sách">
            <Text lineHeight="tall">
              Chúng tôi có thể cập nhật chính sách này. Phiên bản mới sẽ được
              đăng tại trang này kèm ngày cập nhật.
            </Text>
          </Section>

          <Section title="9. Liên hệ">
            <Text lineHeight="tall">
              Mọi thắc mắc về quyền riêng tư, liên hệ:{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`} color="cerulean.700">
                {CONTACT_EMAIL}
              </Link>
              .
            </Text>
          </Section>

          <Text fontSize="sm" color="fg.muted" pt={2}>
            <Link href="/" color="cerulean.700">
              ← Về trang chủ
            </Link>
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
