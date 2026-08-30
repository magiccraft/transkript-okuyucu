# 🎬 Transkript Okuyucu / Transcript Reader

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white" alt=".NET 9" />
  <img src="https://img.shields.io/badge/C%23-239120?logo=csharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

A modern, fast, and responsive web application built with **C# and .NET 9** that fetches YouTube video transcripts and subtitles, provides real-time synchronized playback and transcript highlighting, and exports beautifully formatted **Word (.docx)** documents with timestamps.

> 🌐 *Türkçe açıklama için [buraya tıklayın](#-türkçe-açıklama).*

---

## ✨ Key Features

- **⏱️ Timestamped Transcript Reader:** Automatically detects and lists all available captions (manual & auto-generated tracks) in any language.
- **⚡ Real-Time Synchronized Highlighting:** Automatically highlights the spoken line in real time as the video plays, with smooth auto-scroll to keep the active line in view.
- **🎯 Click-to-Seek Navigation:** Clicking any transcript line or timestamp immediately seeks the YouTube video to that exact second.
- **📖 Interactive Vocabulary & Dictionary Popup:** Click any word in the transcript to instantly view its Turkish translation, detailed English definitions, parts of speech, and listen to authentic native pronunciation audio. Powered by built-in offline dictionary with online fallback.
- **🤖 AI Video Summary & Analysis:** Integrated AI assistant powered by Google Gemini to generate comprehensive summaries, key takeaways, action items, or answer custom questions about the video.
- **📄 Word (.docx) Export:** Generates professional Microsoft Word documents containing video metadata (title, channel, link) and a styled timestamped transcript table.
- **📦 Multi-Format Export:** Download transcripts in **DOCX**, **TXT**, **SRT (Subtitles)**, or copy directly to clipboard.
- **🎮 Sleek Hover Video Controller:** Custom floating overlay player controls (Play/Pause, -10s/+10s seek, interactive progress bar with time hover tooltip, volume slider with mute, playback speed selector, and fullscreen toggle).
- **🔍 In-Transcript Search:** Instant live filtering and search query highlighting across transcript lines.
- **🌓 Dark & Light Theme:** Elegant theme switching with user preference persistence.
- **🔗 Direct Video Link:** Quick link button to open the original video on YouTube.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** C# .NET 9 (ASP.NET Core Minimal API)
- **Libraries:**
  - [`YoutubeExplode`](https://github.com/Tyrrrz/YoutubeExplode) (v6.6.2) – Metadata and caption track extraction
  - [`DocumentFormat.OpenXml`](https://github.com/dotnet/Open-XML-SDK) (v3.5.1) – Word (.docx) document generation
- **Frontend:** HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism, Dark/Light mode), Vanilla JavaScript & Official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

---

## 🚀 Getting Started & How to Use

There are **two ways** to run and use this application:

### 🌟 Option 1: Quick Start (No Installation / Pre-built Binaries) — *Recommended for General Users*
You do **not** need to install .NET or any developer tools:
1. Go to the [**Releases**](../../releases) page.
2. Download the ready-to-run package for your operating system:
   - **Windows:** `TranskriptOkuyucu-Windows-x64.zip` (Extract & double-click `TranskriptOkuyucu.exe`)
   - **macOS (Apple Silicon):** `TranskriptOkuyucu-macOS-AppleSilicon.zip`
   - **macOS (Intel):** `TranskriptOkuyucu-macOS-Intel.zip`
   - **Linux:** `TranskriptOkuyucu-Linux-x64.zip`
3. The app will launch and automatically open your default browser at **http://localhost:5240**!

---

### 💻 Option 2: Run from Source Code — *For Developers*

#### Prerequisites
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) or higher installed.

#### Installation & Run
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/transkript-okuyucu.git
   cd transkript-okuyucu
   ```

2. **Run the application:**
   ```bash
   dotnet run
   ```

3. **Open in browser:**
   Navigate to 👉 **[http://localhost:5240](http://localhost:5240)**

---

## ⚠️ Disclaimer

This project is an independent, open-source tool created for educational and personal productivity purposes. 
- It is **not** affiliated with, endorsed by, or officially connected to YouTube, Google LLC, or any of their subsidiaries.
- The application does not store, host, or pirate copyrighted video or audio content. Video playback is rendered via the official YouTube IFrame API, and subtitles are retrieved on-demand for personal viewing and analysis.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---
---

## 🇹🇷 Türkçe Açıklama

C# ve .NET 9 teknolojileri ile geliştirilmiş, YouTube videolarının altyazı ve transkriptlerini çıkaran, video ile eşzamanlı (senkronize) izleme & okuma imkanı sunan ve **Word (.docx)** belgesi formatında indirme seçeneği sağlayan modern ve kullanıcı dostu bir web uygulaması.

### ✨ Öne Çıkan Özellikler

- **Zaman Damgalı Transkript Okuyucu:** YouTube videolarının resmi ve otomatik oluşturulmuş tüm altyazı dillerini algılar ve listeler.
- **Canlı Eşzamanlı Vurgulama (Sync Highlight):** Gömülü YouTube videosu oynatılırken o an konuşulan transkript satırı anlık olarak parlar ve otomatik kaydırma ile ekranda tutulur.
- **Zaman Damgasına Tıklayarak Atlama:** Transkriptteki herhangi bir satıra veya zaman damgasına tıklandığında video doğrudan o saniyeye sarar ve oynatır.
- **📖 İnteraktif Kelime & Sözlük Pop-up:** Transkriptteki herhangi bir kelimeye tıklayarak anında Türkçe karşılığını, detaylı İngilizce tanımlarını, kelime türlerini ve sesli doğru telaffuzunu dinleyebilirsiniz. Çevrimdışı Türkçe sözlük veri tabanı ve çevrimiçi sözlük desteği içerir.
- **🤖 Yapay Zeka (AI) Video Özeti & Analiz:** Google Gemini destekli yerleşik yapay zeka asistanı ile video transkriptinden ana noktalar, özet, yapılacaklar listesi veya özel soru-cevap analizi üretme.
- **Word (.docx) İndirme:** Video başlığı, kanal adı, video linki ve zaman damgalı konuşma tablosunu içeren profesyonel bir Word belgesi üretir.
- **Farklı Dışa Aktarma Seçenekleri:** Word (.docx), Metin (.txt), Altyazı (.srt) ve Panoya Kopyalama.
- **Hover Video Kontrol Barı:** Video üzerine gelindiğinde görünen şık oynatıcı kontrolleri (Oynat/Durdur, -10s/+10s sarma, hover zaman önizlemeli progress bar, ses kaydırıcısı ve mute, oynatma hızı seçici, tam ekran ve klavye kısayolları).
- **Transkript İçi Arama:** Transkript içinde anlık arama ve eşleşen kelimeleri renklendirme.
- **Koyu (Dark) ve Açık (Light) Tema:** Kullanıcı tercihini saklayan modern tasarım.

---

### 🚀 Başlatma ve Kullanım Seçenekleri

Uygulamayı çalıştırmak için **iki kolay yol** bulunmaktadır:

#### 🌟 1. Yol: Kurulumsuz Tek Tıkla Çalıştırma (Son Kullanıcılar İçin)
Bilgisayarınızda hiçbir geliştirici aracı veya .NET yüklü olmasına gerek yoktur:
1. Sağ taraftaki [**Releases (Sürümler)**](../../releases) sayfasına gidin.
2. İşletim sisteminize uygun `.zip` dosyasını indirin:
   - **Windows:** `TranskriptOkuyucu-Windows-x64.zip` (Arşivden çıkarıp `TranskriptOkuyucu.exe` dosyasına çift tıklayın)
   - **macOS (Apple Silicon M1/M2/M3/M4):** `TranskriptOkuyucu-macOS-AppleSilicon.zip`
   - **macOS (Intel):** `TranskriptOkuyucu-macOS-Intel.zip`
   - **Linux:** `TranskriptOkuyucu-Linux-x64.zip`
3. Program açıldığında tarayıcınız otomatik olarak **http://localhost:5240** adresinde başlayacaktır!

---

#### 💻 2. Yol: Kaynak Koddan Çalıştırma (Geliştiriciler İçin)
1. Bilgisayarınızda [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) yüklü olduğundan emin olun.
2. Terminalden proje klasöründe şu komutu çalıştırın:
   ```bash
   dotnet run
   ```
3. Tarayıcınızdan aşağıdaki adrese gidin:
   👉 **[http://localhost:5240](http://localhost:5240)**

---

### ⚠️ Sorumluluk Reddi Beyanı (Disclaimer)

Bu proje eğitim, araştırma ve kişisel kullanım amacıyla geliştirilmiş bağımsız bir açık kaynak projesidir.
- Projenin YouTube, Google LLC veya herhangi bir iştiraki ile resmi bir bağı, sponsorluğu veya ortaklığı **bulunmamaktadır**.
- Uygulama telif hakkı içeren herhangi bir video veya ses dosyasını sunucuda saklamaz veya korsan olarak barındırmaz. Video oynatımı resmi YouTube IFrame API'si üzerinden gerçekleşir; transkriptler ise yalnızca kişisel okuma ve analiz amacıyla anlık olarak çekilir.

### 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.
