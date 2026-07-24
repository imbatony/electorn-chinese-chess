import { AboutInfoPayload } from '../common/IPCInfos';

import ICON from '../../assets/img/ICON.png';
import './about.css';

window.aboutApi.onInfo(
  ({ info, appName: app_name, version, runtimeVersions }: AboutInfoPayload) => {
    console.log(info);
    // Note: app.getName() was replaced with app.name at Electron v7
    const open_home = (): void => {
      void window.aboutApi.openExternal(info.homepage);
    };
    const setContent = (element: HTMLElement, value: string): void => {
      if (info.use_inner_html) {
        element.innerHTML = value;
      } else {
        element.innerText = value;
      }
    };
    document.title = info.title || `About ${app_name}`;

    const title_elem = document.querySelector('.title') as HTMLHeadingElement;
    title_elem.innerText = `${app_name} ${version}`;

    if (info.homepage) {
      title_elem.addEventListener('click', open_home);
      title_elem.classList.add('clickable');
      const logo_elem = document.querySelector('.logo');
      logo_elem.addEventListener('click', open_home);
      logo_elem.classList.add('clickable');
    }

    const copyright_elem = document.querySelector('.copyright') as HTMLElement;
    if (info.copyright) {
      setContent(copyright_elem, info.copyright);
    } else if (info.license) {
      setContent(copyright_elem, `Distributed under ${info.license} license.`);
    }

    const icon_elem = document.getElementById('app-icon') as HTMLImageElement;
    icon_elem.src = ICON;

    if (info.description) {
      const desc_elem = document.querySelector('.description') as HTMLElement;
      setContent(desc_elem, info.description);
    }

    if (info.bug_report_url) {
      const bug_report = document.querySelector('.bug-report-link') as HTMLDivElement;
      bug_report.innerText = info.bug_link_text || 'Report an issue';
      bug_report.addEventListener('click', (e) => {
        e.preventDefault();
        void window.aboutApi.openExternal(info.bug_report_url);
      });
    }
    if (info.homepage) {
      const homepageEle = document.querySelector('.sourcecode-link') as HTMLDivElement;
      homepageEle.innerText = info.visit_source_code_text || 'Visit source code';
      homepageEle.addEventListener('click', (e) => {
        e.preventDefault();
        void window.aboutApi.openExternal(info.homepage);
      });
    }

    if (info.css_path) {
      const css_paths = !Array.isArray(info.css_path) ? [info.css_path] : info.css_path;
      for (const css_path of css_paths) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = css_path;
        document.head.appendChild(link);
      }
    }

    if (info.adjust_window_size) {
      const height = document.body.scrollHeight;
      const width = document.body.scrollWidth;
      window.aboutApi.adjustWindow({
        height,
        width,
        showCloseButton: !!info.show_close_button,
      });
    }

    if (info.use_version_info) {
      const versions = document.querySelector('.versions');
      const version_info: [string, string][] = Array.isArray(info.use_version_info)
        ? info.use_version_info
        : runtimeVersions;
      for (const [name, value] of version_info) {
        const tr = document.createElement('tr');
        const name_td = document.createElement('td');
        name_td.innerText = name;
        tr.appendChild(name_td);
        const version_td = document.createElement('td');
        version_td.innerText = ' : ' + value;
        tr.appendChild(version_td);
        versions.appendChild(tr);
      }
    }

    if (info.show_close_button) {
      const buttons = document.querySelector('.buttons');
      const close_button = document.createElement('button');
      close_button.innerText = info.show_close_button;
      close_button.addEventListener('click', (e) => {
        e.preventDefault();
        window.aboutApi.closeWindow();
      });
      buttons.appendChild(close_button);
      close_button.focus();
    }
  }
);
