import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ListComponent } from './list.component';
import { ViewComponent } from './view.component';
import { EditComponent } from './edit.component';

const routes: Routes = [
    { path: '', component: ListComponent },
    { path: 'view/:id', component: ViewComponent },
    { path: 'edit/:id', component: EditComponent }
];

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forChild(routes)
    ],
    declarations: [
        ListComponent,
        ViewComponent,
        EditComponent
    ]
})
export class WorkflowsModule { } 