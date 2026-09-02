import { useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radii } from '@/constants/theme';

const LAST_UPDATE = '۱۴۰۵/۰۶/۰۱';

function Section({ title, icon, children, colors }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon} size={17} color={colors.accent} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: topInset }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderSoft }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-forward" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>حریم خصوصی</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            آخرین بروزرسانی: {LAST_UPDATE}{'\n'}
            این سند توضیح می‌دهد که برنامه «مدیریت خودرو» با اطلاعات شما چه می‌کند.
          </Text>

          <Section title="ذخیره‌سازی کاملاً محلی" icon="phone-portrait-outline" colors={colors}>
            تمام اطلاعاتی که در این برنامه وارد می‌کنید — شامل سرویس‌ها، درآمدها، هزینه‌ها، وام‌ها، اقساط، اطلاعات پرسنل و تنظیمات — فقط و فقط روی حافظه‌ی همین گوشی شما ذخیره می‌شود. این برنامه هیچ سروری ندارد و هیچ داده‌ای به هیچ سرور، شرکت یا شخص ثالثی ارسال نمی‌شود.
          </Section>

          <Section title="چه اطلاعاتی جمع‌آوری می‌شود؟" icon="document-text-outline" colors={colors}>
            برنامه هیچ داده‌ای را برای سازنده یا هر شخص دیگری «جمع‌آوری» نمی‌کند. اطلاعاتی که وارد می‌کنید فقط برای نمایش در خود برنامه استفاده می‌شود و نزد خود شما باقی می‌ماند.
          </Section>

          <Section title="رمز عبور (PIN) و اثر انگشت" icon="finger-print-outline" colors={colors}>
            رمز عبور شما به‌صورت هش‌شده (رمزنگاری یک‌طرفه) روی گوشی ذخیره می‌شود و حتی خود برنامه هم قادر به بازیابی رمز اصلی از روی آن نیست. در صورت فعال‌سازی ورود با اثر انگشت، این عملیات کاملاً توسط سیستم‌عامل گوشی شما انجام می‌شود و اطلاعات بیومتریک هرگز در اختیار برنامه یا سازنده قرار نمی‌گیرد.
          </Section>

          <Section title="اعلان‌ها (نوتیفیکیشن)" icon="notifications-outline" colors={colors}>
            مجوز نوتیفیکیشن فقط برای یادآوری‌های داخلی برنامه (مانند سررسید اقساط یا اسناد) استفاده می‌شود و این یادآوری‌ها به‌طور کامل روی گوشی شما زمان‌بندی و اجرا می‌شوند.
          </Section>

          <Section title="پشتیبان‌گیری و انتقال داده" icon="cloud-upload-outline" colors={colors}>
            اگر از قابلیت «خروجی گرفتن» استفاده کنید، یک فایل پشتیبان روی گوشی خودتان ذخیره می‌شود که کاملاً در اختیار شماست. این فایل به هیچ سروری ارسال نمی‌شود و انتقال آن به هر مقصدی (مثلاً اشتراک‌گذاری دستی) کاملاً با انتخاب و مسئولیت خود شماست.
          </Section>

          <Section title="حذف اطلاعات" icon="trash-outline" colors={colors}>
            شما در هر زمان می‌توانید از بخش تنظیمات، تمام اطلاعات ذخیره‌شده را پاک کنید. همچنین حذف کامل برنامه از گوشی، تمام داده‌های محلی مرتبط با آن را نیز پاک می‌کند.
          </Section>

          <Section title="کاربران خردسال" icon="people-outline" colors={colors}>
            این برنامه برای استفاده‌ی رانندگان و کاربران بزرگسال طراحی شده و به‌طور خاص برای کودکان در نظر گرفته نشده است.
          </Section>

          <Section title="تغییرات این سند" icon="refresh-outline" colors={colors}>
            در صورت هرگونه تغییر در نحوه‌ی مدیریت اطلاعات، همین صفحه بروزرسانی خواهد شد.
          </Section>

          <View style={[styles.card, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Text style={[styles.cardBody, { color: colors.text, textAlign: 'center', fontWeight: '700' }]}>
              خلاصه: اطلاعات شما فقط مال شماست و روی گوشی خودتان می‌ماند. ✓
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', writingDirection: 'rtl' },
  intro: { fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl', lineHeight: 20 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  cardBody: { fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl', lineHeight: 21 },
});
